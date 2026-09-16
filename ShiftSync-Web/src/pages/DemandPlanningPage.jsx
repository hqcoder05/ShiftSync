import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DemandPlanningModal from '../components/demand-planning/DemandPlanningModal';

export default function DemandPlanningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storeId =
    searchParams.get('storeId') ||
    localStorage.getItem('selectedStoreId') ||
    localStorage.getItem('storeId') ||
    '';
  const dateIso = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  return (
    <div style={{ minHeight: 'calc(100vh - 56px)', background: '#f8fafc', padding: 0 }}>
      <DemandPlanningModal
        isOpen={true}
        onClose={() => navigate('/schedule')}
        storeId={storeId}
        initialDateIso={dateIso}
        onSuccess={() => {
          navigate('/schedule');
        }}
      />
    </div>
  );
}
