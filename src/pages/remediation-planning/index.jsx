import React, { useState } from 'react';
import Header from '../../components/ui/Header';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import RemediationMetrics from './components/RemediationMetrics';
import RemediationFilters from './components/RemediationFilters';
import RemediationPlansTable from './components/RemediationPlansTable';
import CreatePlanModal from './components/CreatePlanModal';
import PlanDetailModal from './components/PlanDetailModal';
import RiskConverterModal from './components/RiskConverterModal';

const RemediationPlanning = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRiskConverterModalOpen, setIsRiskConverterModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleCreatePlan = (planData) => {
    console.log('Creating new remediation plan:', planData);
    setIsCreateModalOpen(false);
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BreadcrumbNavigation />
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mt-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#0B2E33' }}>Remediation Planning</h1>
              <p className="text-muted-foreground mt-2">
                Manage and track remediation strategies for identified PII risks
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-6">
              <RemediationFilters />
              <RemediationPlansTable onPlanSelect={handlePlanSelect} />
            </div>
            <div className="xl:col-span-1">
              <RemediationMetrics />
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreatePlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreatePlan={handleCreatePlan}
      />
      <PlanDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        plan={selectedPlan}
      />
      <RiskConverterModal
        isOpen={isRiskConverterModalOpen}
        onClose={() => setIsRiskConverterModalOpen(false)}
      />
    </div>
  );
};

export default RemediationPlanning;
