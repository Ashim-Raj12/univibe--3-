import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import StudyMaterialsTab from '../components/StudyMaterialsTab';
import StudyGroupsTab from '../components/StudyGroupsTab';
import AssignmentsTab from '../components/AssignmentsTab';

type ActiveTab = 'materials' | 'groups' | 'assignments';

const StudyHubPage: React.FC = () => {
    const { profile } = useAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>('materials');

    const TabButton: React.FC<{ tabName: ActiveTab; icon: React.ReactNode; children: React.ReactNode }> = ({ tabName, icon, children }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 whitespace-nowrap py-4 px-4 border-b-2 font-semibold text-sm transition-colors focus:outline-none ${
                activeTab === tabName
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:text-text-body hover:border-slate-300'
            }`}
        >
            {icon}
            {children}
        </button>
    );

    const icons = {
        materials: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2H9z" /><path d="M4 12a2 2 0 012-2h10a2 2 0 110 4H6a2 2 0 01-2-2z" /></svg>,
        groups: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a5 5 0 015-5c.24 0 .47.02.7.055a7.002 7.002 0 01-2.955 1.94z" /></svg>,
        assignments: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>,
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-text-heading">Study Hub</h1>
            <div className="bg-card rounded-2xl shadow-soft border border-slate-200/50">
                <div className="border-b border-slate-200/80">
                    <nav className="-mb-px flex space-x-2 sm:space-x-6 px-4 sm:px-6" aria-label="Tabs">
                        <TabButton tabName="materials" icon={icons.materials}>Materials</TabButton>
                        <TabButton tabName="groups" icon={icons.groups}>Groups</TabButton>
                        <TabButton tabName="assignments" icon={icons.assignments}>Assignments</TabButton>
                    </nav>
                </div>

                <div className="p-2 sm:p-4">
                    {activeTab === 'materials' && profile && <StudyMaterialsTab collegeName={profile.college!} />}
                    {activeTab === 'groups' && <StudyGroupsTab />}
                    {activeTab === 'assignments' && <AssignmentsTab />}
                </div>
            </div>
        </div>
    );
};

export default StudyHubPage;
