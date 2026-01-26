import TabNavigator from '../components/TabNavigator';
import CellManagement from '../components/CellManagement';
import CellAttendance from '../components/CellAttendance';
import AttendanceChart from '../components/AttendanceChart';
import { ROLES, ROLE_GROUPS } from '../constants/roles';

const Enviar = () => {
    const tabs = [
        { id: 'attendance', label: 'Asistencia', component: CellAttendance },
        { id: 'cells', label: 'Células', component: CellManagement, roles: ROLE_GROUPS.CAN_MANAGE_CELLS },
        { id: 'stats', label: 'Estadísticas', component: AttendanceChart, roles: ROLE_GROUPS.CAN_VIEW_STATS },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Enviar</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Gestión de asistencia a células y estadísticas</p>
            </div>

            <TabNavigator tabs={tabs} initialTabId="attendance" />
        </div>
    );
};

export default Enviar;
