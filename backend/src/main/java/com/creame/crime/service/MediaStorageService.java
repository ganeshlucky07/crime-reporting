package com.creame.crime.service;

import com.creame.crime.config.AppProperties;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MediaStorageService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MediaStorageService.class);
    private static final List<String> IMAGE_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".gif", ".webp");
    private static final List<String> VIDEO_EXTENSIONS = List.of(".mp4", ".webm", ".mov", ".m4v");

    private final AppProperties appProperties;

    public MediaStorageService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public StoredMedia storeMediaFiles(List<MultipartFile> mediaFiles) {
        if (mediaFiles == null || mediaFiles.isEmpty()) {
            return StoredMedia.empty();
        }

        List<MultipartFile> nonEmptyFiles = mediaFiles.stream()
                .filter(file -> !file.isEmpty())
                .toList();

        if (nonEmptyFiles.isEmpty()) {
            return StoredMedia.empty();
        }

        int maxFiles = appProperties.getMedia().getMaxFilesPerReport();
        if (nonEmptyFiles.size() > maxFiles) {
            throw new IllegalArgumentException("You can upload up to " + maxFiles + " files per report.");
        }

        Path imageDirectory = resolveUploadDirectory("images");
        Path videoDirectory = resolveUploadDirectory("videos");

        List<String> imageUrls = new ArrayList<>();
        List<String> videoUrls = new ArrayList<>();

        for (MultipartFile file : nonEmptyFiles) {
            String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
            String extension = extractExtension(file.getOriginalFilename());
            boolean image = contentType.startsWith("image/") || IMAGE_EXTENSIONS.contains(extension);
            boolean video = contentType.startsWith("video/") || VIDEO_EXTENSIONS.contains(extension);

            if (!image && !video) {
                throw new IllegalArgumentException("Only image and video files are allowed.");
            }

            validateSize(file, image);
            validateExtension(extension, image);
            String storedFileName = UUID.randomUUID() + extension;
            Path targetDirectory = image ? imageDirectory : videoDirectory;
            Path targetPath = targetDirectory.resolve(storedFileName);
            copyToPath(file, targetPath);

            if (image) {
                imageUrls.add("/uploads/images/" + storedFileName);
            } else {
                videoUrls.add("/uploads/videos/" + storedFileName);
            }
        }

        return new StoredMedia(imageUrls, videoUrls);
    }

    public Path getUploadRootPath() {
        return Path.of(appProperties.getMedia().getUploadDir()).toAbsolutePath().normalize();
    }

    public void deleteMediaUrls(List<String> mediaUrls) {
        if (mediaUrls == null || mediaUrls.isEmpty()) {
            return;
        }

        Path uploadRoot = getUploadRootPath();
        for (String mediaUrl : mediaUrls) {
            if (mediaUrl == null || mediaUrl.isBlank()) {
                continue;
            }

            String normalizedUrl = mediaUrl.replace('\\', '/');
            String relativePath;
            if (normalizedUrl.startsWith("/uploads/")) {
                relativePath = normalizedUrl.substring("/uploads/".length());
            } else if (normalizedUrl.startsWith("uploads/")) {
                relativePath = normalizedUrl.substring("uploads/".length());
            } else {
                continue;
            }

            Path targetPath = uploadRoot.resolve(relativePath).normalize();
            if (!targetPath.startsWith(uploadRoot)) {
                continue;
            }

            try {
                Files.deleteIfExists(targetPath);
            } catch (IOException exception) {
                LOGGER.warn("Unable to delete media file {}", targetPath, exception);
            }
        }
    }

    private Path resolveUploadDirectory(String childDirectory) {
        try {
            Path path = getUploadRootPath().resolve(childDirectory).normalize();
            Files.createDirectories(path);
            return path;
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to create media upload directory", exception);
        }
    }

    private void validateSize(MultipartFile file, boolean image) {
        long maxBytes = image ? appProperties.getMedia().getMaxImageBytes() : appProperties.getMedia().getMaxVideoBytes();
        if (file.getSize() > maxBytes) {
            String readableLimit = image ? "4MB" : "15MB";
            throw new IllegalArgumentException("Each " + (image ? "image" : "video") + " must be under " + readableLimit + ".");
        }
    }

    private String extractExtension(String originalFilename) {
        String safeName = originalFilename == null ? "" : originalFilename.trim().toLowerCase(Locale.ROOT);
        int lastDotIndex = safeName.lastIndexOf('.');
        if (lastDotIndex < 0) {
            throw new IllegalArgumentException("Uploaded file is missing an extension.");
        }
        return safeName.substring(lastDotIndex);
    }

    private void validateExtension(String extension, boolean image) {
        List<String> allowedExtensions = image ? IMAGE_EXTENSIONS : VIDEO_EXTENSIONS;
        if (!allowedExtensions.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type. Use common image/video formats only.");
        }
    }

    private void copyToPath(MultipartFile file, Path targetPath) {
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, targetPath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to save uploaded media file", exception);
        }
    }

    public record StoredMedia(List<String> imageUrls, List<String> videoUrls) {
        static StoredMedia empty() {
            return new StoredMedia(List.of(), List.of());
        }
    }
}
