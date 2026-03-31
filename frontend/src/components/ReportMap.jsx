import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { DEFAULT_MAP_CENTER } from "../lib/constants";
import { formatCoordinates, formatDateTime, humanizeStatus } from "../lib/format";

export default function ReportMap({ reports, height = "420px" }) {
  const center = reports.length
    ? [reports[0].latitude, reports[0].longitude]
    : DEFAULT_MAP_CENTER;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <MapContainer center={center} zoom={reports.length ? 11 : 6} className="w-full" style={{ height }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map((report) => (
          <Marker key={report.id} position={[report.latitude, report.longitude]}>
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{report.title}</p>
                <p>{humanizeStatus(report.status)}</p>
                <p>{formatCoordinates(report.latitude, report.longitude)}</p>
                <p>{formatDateTime(report.createdAt)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
