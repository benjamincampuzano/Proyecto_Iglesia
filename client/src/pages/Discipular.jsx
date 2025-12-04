import CapacitacionDestino from '../components/CapacitacionDestino';

const Discipular = () => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Discipular</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Sistema de capacitación y formación de discípulos</p>
            </div>

            {/* Capacitación Destino Component */}
            <CapacitacionDestino />
        </div>
    );
};

export default Discipular;
