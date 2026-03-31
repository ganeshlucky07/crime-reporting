export function getErrorMessage(error, fallbackMessage) {
  const apiMessage = error.response?.data?.message;
  if (apiMessage) {
    return apiMessage;
  }

  if (error.response?.status === 401) {
    return "Your session is not valid anymore. Please sign in again.";
  }

  if (error.response?.status === 403) {
    return "You do not have permission to access this page.";
  }

  if (!error.response) {
    if (error.code === "ECONNABORTED") {
      return "The server is taking too long to respond. It may still be waking up.";
    }

    return "The backend is unavailable right now. Start the Spring Boot API and check SQLite/JWT configuration.";
  }

  return fallbackMessage;
}
