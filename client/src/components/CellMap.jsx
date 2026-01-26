import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Users, Clock, MapPin } from 'lucide-react';
import PropTypes from 'prop-types';

// Fix for default marker icons in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    iconRetinaUrl: iconRetina,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to update map view when cells change
const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
};

const CellMap = ({ cells = [] }) => {
    const [center, setCenter] = useState([4.5709, -74.2973]); // Default Bogotá/Colombia
    const [zoom, setZoom] = useState(6);

    // Filter cells that have coordinates
    const georeferencedCells = cells.filter(c => c.latitude !== null && c.longitude !== null && !isNaN(c.latitude) && !isNaN(c.longitude));

    useEffect(() => {
        console.log('CellMap received cells:', cells.length);
        console.log('Georeferenced cells:', georeferencedCells.length, georeferencedCells);

        if (georeferencedCells.length > 0) {
            const avgLat = georeferencedCells.reduce((sum, c) => sum + parseFloat(c.latitude), 0) / georeferencedCells.length;
            const avgLon = georeferencedCells.reduce((sum, c) => sum + parseFloat(c.longitude), 0) / georeferencedCells.length;

            if (!isNaN(avgLat) && !isNaN(avgLon)) {
                setCenter([avgLat, avgLon]);
                setZoom(13);
            }
        }
    }, [cells]);

    return (
        <div className="w-full h-[250px] rounded-xl overflow-hidden shadow-lg border border-gray-200 relative z-10">
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="w-full h-full">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeView center={center} zoom={zoom} />
                {georeferencedCells.map(cell => (
                    <Marker key={cell.id} position={[cell.latitude, cell.longitude]}>
                        <Popup>
                            <div className="p-1 min-w-[200px]">
                                <h3 className="font-bold text-blue-700 text-base mb-2">{cell.name}</h3>
                                <div className="space-y-1.5 text-sm text-gray-700">
                                    <div className="flex items-center gap-2">
                                        <Users size={14} className="text-gray-500" />
                                        <span><strong>Líder:</strong> {cell.leader?.fullName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-gray-500" />
                                        <span><strong>Horario:</strong> {cell.dayOfWeek} {cell.time}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-gray-500" />
                                        <span><strong>Dirección:</strong> {cell.address}, {cell.city}</span>
                                    </div>
                                </div>
                                <div className="mt-3 text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-full w-fit">
                                    {cell._count?.members || 0} Discípulos Actuales
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default CellMap;

CellMap.propTypes = {
    cells: PropTypes.array,
};
