import React, { useState, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const FileUploadModal = ({ isOpen, onClose, onFilesProcessed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [processingOptions, setProcessingOptions] = useState({
    autoGenerateRemediation: true,
    riskSeverity: 'medium',
    dataSource: '',
    assignee: '',
    enableAIAnalysis: true,
    generateCompliance: true,
    notifyTeam: true
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedResults, setProcessedResults] = useState(null);

  const allowedFileTypes = [
    { extension: '.csv', type: 'text/csv', description: 'CSV files for risk data import' },
    { extension: '.pdf', type: 'application/pdf', description: 'PDF documents containing risk assessments' },
    { extension: '.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Word documents with compliance reports' },
    { extension: '.doc', type: 'application/msword', description: 'Legacy Word documents' },
    { extension: '.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', description: 'Excel spreadsheets with risk matrices' },
    { extension: '.xls', type: 'application/vnd.ms-excel', description: 'Legacy Excel files' },
    { extension: '.txt', type: 'text/plain', description: 'Plain text risk assessments' }
  ];

  const riskSeverityOptions = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  const dataSourceOptions = [
    { value: 'audit_report', label: 'Audit Report' },
    { value: 'compliance_scan', label: 'Compliance Scan' },
    { value: 'risk_assessment', label: 'Risk Assessment' },
    { value: 'penetration_test', label: 'Penetration Test' },
    { value: 'vulnerability_scan', label: 'Vulnerability Scan' },
    { value: 'policy_review', label: 'Policy Review' },
    { value: 'third_party_assessment', label: 'Third-party Assessment' }
  ];

  const assigneeOptions = [
    { value: 'sarah_mitchell', label: 'Sarah Mitchell - Compliance Lead' },
    { value: 'james_wilson', label: 'James Wilson - Security Analyst' },
    { value: 'emily_chen', label: 'Emily Chen - Risk Manager' },
    { value: 'michael_brown', label: 'Michael Brown - Data Protection Officer' },
    { value: 'lisa_garcia', label: 'Lisa Garcia - IT Security Manager' }
  ];

  const handleDrag = useCallback((e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (e?.type === "dragenter" || e?.type === "dragover") {
      setDragActive(true);
    } else if (e?.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDragActive(false);
    
    if (e?.dataTransfer?.files && e?.dataTransfer?.files?.length > 0) {
      handleFiles(e?.dataTransfer?.files);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e?.target?.files && e?.target?.files?.length > 0) {
      handleFiles(e?.target?.files);
    }
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList)?.filter(file => {
      const isValidType = allowedFileTypes?.some(type => 
        file?.type === type?.type || file?.name?.toLowerCase()?.endsWith(type?.extension)
      );
      const isValidSize = file?.size <= 50 * 1024 * 1024; // 50MB limit
      
      if (!isValidType) {
        console.warn(`File ${file?.name} is not a supported type`);
        return false;
      }
      if (!isValidSize) {
        console.warn(`File ${file?.name} exceeds 50MB size limit`);
        return false;
      }
      return true;
    })?.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file?.name,
      size: file?.size,
      type: file?.type,
      status: 'ready',
      progress: 0,
      extractedRisks: [],
      remediationPlans: []
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev?.filter(f => f?.id !== fileId));
    setUploadProgress(prev => {
      const { [fileId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName?.toLowerCase()?.split('.')?.pop();
    switch (extension) {
      case 'pdf': return 'FileText';
      case 'csv': return 'Database';
      case 'docx': case'doc': return 'FileText';
      case 'xlsx': case'xls': return 'FileSpreadsheet';
      case 'txt': return 'File';
      default: return 'File';
    }
  };

  const handleProcessFiles = async () => {
    if (files?.length === 0) return;

    setIsProcessing(true);
    const results = { totalRisks: 0, totalPlans: 0, files: [] };

    for (const fileObj of files) {
      if (fileObj.status === 'processed') continue; // skip already done

      // Simulate a fast upload progress until actual fetch succeeds (fetch doesn't have native upload progress easily, 
      // but we can fake the UI steps for UX while waiting for the AI)
      const steps = [
        { progress: 20, status: 'Uploading file...' },
        { progress: 40, status: 'Extracting content...' },
        { progress: 60, status: 'AI Analyzing risks...' },
        { progress: 80, status: 'AI Generating remediation...' },
      ];

      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < steps.length) {
          setUploadProgress(prev => ({ ...prev, [fileObj.id]: steps[stepIndex] }));
          stepIndex++;
        }
      }, 800);

      try {
        const formData = new FormData();
        formData.append("file", fileObj.file);
        formData.append("message", "Uploaded via compliance dashboard modal");
        
        const API_BASE = (import.meta?.env?.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
        const response = await fetch(`${API_BASE}/chat/upload`, {
          method: "POST",
          body: formData
        });

        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [fileObj.id]: { progress: 100, status: 'Complete' } }));

        if (!response.ok) {
           throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();
        const ai_analysis = data.report?.ai_analysis || {};
        
        // Convert ai_analysis back to the format this modal expects for 'risks' and 'plans' arrays
        const extractedRisks = (ai_analysis.violated_regulations || []).map((reg, idx) => ({
          id: `risk-${fileObj.id}-${idx}`,
          title: reg,
          severity: ai_analysis.risk_level?.toLowerCase() || 'medium',
          category: 'Compliance',
          description: `AI identified violation of: ${reg}`,
          affectedSystems: 1,
          estimatedImpact: ai_analysis.risk_level === 'CRITICAL' ? 'High' : 'Medium'
        }));

        const remediationPlans = (ai_analysis.remediation_actions || []).map((action, idx) => ({
          id: `plan-${fileObj.id}-${idx}`,
          riskId: extractedRisks[idx]?.id || `plan-${fileObj.id}-${idx}`, 
          title: `AI Remediation: ${action.substring(0, 30)}...`,
          priority: ai_analysis.risk_level?.toLowerCase() || 'medium',
          estimatedHours: 4,
          tasks: [action],
          assignee: processingOptions?.assignee || 'sarah_mitchell',
          targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)?.toISOString()?.split('T')?.[0]
        }));
        
        setFiles(prev => prev?.map(f => 
          f?.id === fileObj?.id 
            ? { ...f, status: 'processed', extractedRisks, remediationPlans, aiData: ai_analysis }
            : f
        ));

        results.totalRisks += extractedRisks.length;
        results.totalPlans += remediationPlans.length;
        results.files.push({
          name: fileObj.name,
          risksFound: extractedRisks.length,
          plansCreated: remediationPlans.length
        });

      } catch (err) {
        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [fileObj.id]: { progress: 0, status: `Error: ${err.message}` } }));
        setFiles(prev => prev?.map(f => f?.id === fileObj?.id ? { ...f, status: 'error' } : f));
      }
    }

    setProcessedResults(results);
    setIsProcessing(false);
  };

  const handleCreateRemediationPlans = () => {
    const allPlans = files
      ?.filter(f => f?.status === 'processed')
      ?.flatMap(f => f?.remediationPlans || []);

    const allRisks = files
      ?.filter(f => f?.status === 'processed')
      ?.flatMap(f => f?.extractedRisks || []);

    onFilesProcessed?.({
      risks: allRisks,
      plans: allPlans,
      processingOptions,
      summary: processedResults
    });

    onClose();
    
    // Reset state
    setFiles([]);
    setUploadProgress({});
    setProcessedResults(null);
    setIsProcessing(false);
  };

  const handleOptionChange = (field, value) => {
    setProcessingOptions(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-300 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Upload Compliance Files</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload CSV, PDF, Word, or Excel files to extract risks and generate remediation plans
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - File Upload */}
            <div className="space-y-6">
              {/* Drag & Drop Area */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="p-3 bg-accent/10 rounded-full">
                    <Icon name="Upload" size={32} className="text-accent" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground mb-2">
                      Drop files here or click to browse
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Supports: CSV, PDF, Word, Excel files up to 50MB each
                    </p>
                  </div>
                </div>

                <input
                  id="fileInput"
                  type="file"
                  multiple
                  className="hidden"
                  accept=".csv,.pdf,.docx,.doc,.xlsx,.xls,.txt"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Supported File Types */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-3">Supported File Types</h4>
                <div className="grid grid-cols-1 gap-2">
                  {allowedFileTypes?.slice(0, 4)?.map((type) => (
                    <div key={type?.extension} className="flex items-center space-x-2 text-sm">
                      <Icon name={getFileIcon(type?.extension)} size={16} className="text-muted-foreground" />
                      <span className="font-mono text-muted-foreground">{type?.extension}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-foreground">{type?.description}</span>
                    </div>
                  ))}
                  {allowedFileTypes?.length > 4 && (
                    <p className="text-sm text-muted-foreground">
                      + {allowedFileTypes?.length - 4} more file types supported
                    </p>
                  )}
                </div>
              </div>

              {/* Processing Options */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Processing Options</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Risk Severity Default"
                    options={riskSeverityOptions}
                    value={processingOptions?.riskSeverity}
                    onChange={(value) => handleOptionChange('riskSeverity', value)}
                    placeholder="Select default severity"
                  />

                  <Select
                    label="Data Source Type"
                    options={dataSourceOptions}
                    value={processingOptions?.dataSource}
                    onChange={(value) => handleOptionChange('dataSource', value)}
                    placeholder="Select source type"
                  />

                  <Select
                    label="Default Assignee"
                    options={assigneeOptions}
                    value={processingOptions?.assignee}
                    onChange={(value) => handleOptionChange('assignee', value)}
                    placeholder="Select default assignee"
                    className="md:col-span-2"
                  />
                </div>

                <div className="space-y-3">
                  <Checkbox
                    label="Auto-generate remediation plans from risks"
                    checked={processingOptions?.autoGenerateRemediation}
                    onChange={(e) => handleOptionChange('autoGenerateRemediation', e?.target?.checked)}
                  />
                  <Checkbox
                    label="Enable AI-powered risk analysis"
                    checked={processingOptions?.enableAIAnalysis}
                    onChange={(e) => handleOptionChange('enableAIAnalysis', e?.target?.checked)}
                  />
                  <Checkbox
                    label="Generate compliance documentation"
                    checked={processingOptions?.generateCompliance}
                    onChange={(e) => handleOptionChange('generateCompliance', e?.target?.checked)}
                  />
                  <Checkbox
                    label="Notify team members upon completion"
                    checked={processingOptions?.notifyTeam}
                    onChange={(e) => handleOptionChange('notifyTeam', e?.target?.checked)}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - File List & Progress */}
            <div className="space-y-6">
              {/* Uploaded Files */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-foreground">
                    Uploaded Files ({files?.length})
                  </h4>
                  {files?.length > 0 && !isProcessing && (
                    <Button
                      onClick={handleProcessFiles}
                      size="sm"
                      iconName="Zap"
                      iconPosition="left"
                    >
                      Process Files
                    </Button>
                  )}
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {files?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Icon name="File" size={32} className="mx-auto mb-2 opacity-50" />
                      <p>No files uploaded yet</p>
                    </div>
                  ) : (
                    files?.map((file) => (
                      <div key={file?.id} className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <Icon name={getFileIcon(file?.name)} size={20} className="text-muted-foreground mt-1" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-foreground truncate">{file?.name}</h5>
                              <button
                                onClick={() => removeFile(file?.id)}
                                className="p-1 hover:bg-muted rounded-md transition-colors"
                              >
                                <Icon name="X" size={14} />
                              </button>
                            </div>
                            
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(file?.size)}
                            </p>

                            {/* Progress Bar */}
                            {uploadProgress?.[file?.id] && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-muted-foreground">
                                    {uploadProgress?.[file?.id]?.status}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {uploadProgress?.[file?.id]?.progress}%
                                  </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress?.[file?.id]?.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Results Summary */}
                            {file?.status === 'processed' && (
                              <div className="mt-3 p-2 bg-success/10 rounded-md">
                                <div className="flex items-center space-x-4 text-sm">
                                  <span className="text-success">
                                    {file?.extractedRisks?.length} risks found
                                  </span>
                                  <span className="text-success">
                                    {file?.remediationPlans?.length} plans generated
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Processing Results */}
              {processedResults && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Icon name="CheckCircle" size={20} className="text-success" />
                    <h4 className="font-medium text-success">Processing Complete!</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{processedResults?.totalRisks}</div>
                      <div className="text-sm text-success/80">Total Risks Extracted</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{processedResults?.totalPlans}</div>
                      <div className="text-sm text-success/80">Remediation Plans Created</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {processedResults?.files?.map((file, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-foreground truncate">{file?.name}</span>
                        <span className="text-success">
                          {file?.risksFound} risks • {file?.plansCreated} plans
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div className="text-sm text-muted-foreground">
            {isProcessing ? (
              <span className="flex items-center space-x-2">
                <Icon name="Loader" size={16} className="animate-spin" />
                <span>Processing files...</span>
              </span>
            ) : processedResults ? (
              `Ready to create ${processedResults?.totalPlans} remediation plans`
            ) : files?.length > 0 ? (
              `${files?.length} file${files?.length === 1 ? '' : 's'} ready to process`
            ) : (
              'Upload files to get started'
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {processedResults && (
              <Button
                onClick={handleCreateRemediationPlans}
                iconName="ArrowRight"
                iconPosition="right"
              >
                Create Remediation Plans
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadModal;