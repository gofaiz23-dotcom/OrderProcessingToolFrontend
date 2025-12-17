'use client';

import { useState, useEffect } from 'react';
import { X, Download, Upload, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Edit2, Save, XCircle, ArrowRight } from 'lucide-react';
import type { ExcelPreviewData } from '../utils/excelFileGenerator';
import { downloadExcelFile, blobToFile } from '../utils/excelFileGenerator';
import { uploadExcel } from '@/app/api/3plGigaFedexApi';
import type { Order } from '@/app/types/order';
import * as XLSX from 'xlsx';

type ExcelPreviewModalProps = {
  isOpen: boolean;
  previewData: ExcelPreviewData | null;
  excelBlob: Blob | null;
  filename?: string;
  onClose: () => void;
  onUpload?: (file: File) => void;
  onDataUpdate?: (updatedPreviewData: ExcelPreviewData, updatedBlob: Blob) => void;
  onNext?: (updatedPreviewData: ExcelPreviewData, updatedBlob: Blob) => void;
  orders?: Order[];
  shippingTypes?: Record<number, 'LTL' | 'Parcel' | ''>;
  subSKUs?: Record<number, string[]>;
  saveOrderData?: (order: Order) => Promise<void>;
};

export const ExcelPreviewModal = ({
  isOpen,
  previewData,
  excelBlob,
  filename = 'orders_preview.xlsx',
  onClose,
  onUpload,
  onDataUpdate,
  onNext,
  orders = [],
  shippingTypes = {},
  subSKUs = {},
  saveOrderData,
}: ExcelPreviewModalProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState<Array<Record<string, string>>>([]);
  const [updatedBlob, setUpdatedBlob] = useState<Blob | null>(null);
  const [currentPreviewData, setCurrentPreviewData] = useState<ExcelPreviewData | null>(previewData);
  const [savingOrders, setSavingOrders] = useState(false);

  // Update current preview data when prop changes
  useEffect(() => {
    setCurrentPreviewData(previewData);
  }, [previewData]);

  // Initialize edited data when preview data changes
  useEffect(() => {
    if (currentPreviewData) {
      setEditedData(currentPreviewData.rows.map(row => ({ ...row })));
    }
  }, [currentPreviewData]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUploading(false);
      setUploadError(null);
      setUploadSuccess(false);
      setIsEditMode(false);
      setUpdatedBlob(null);
      if (previewData) {
        setEditedData(previewData.rows.map(row => ({ ...row })));
        setCurrentPreviewData(previewData);
      }
    }
  }, [isOpen, previewData]);

  const handleDownload = () => {
    const blobToDownload = updatedBlob || excelBlob;
    if (blobToDownload) {
      downloadExcelFile(blobToDownload, filename);
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    if (currentPreviewData) {
      setEditedData(currentPreviewData.rows.map(row => ({ ...row })));
    }
    setUpdatedBlob(null);
  };

  const handleSaveEdit = async () => {
    if (!currentPreviewData || !excelBlob) return;

    try {
      // Load the original Excel file
      const blobToUse = updatedBlob || excelBlob;
      const arrayBuffer = await blobToUse.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON to get template rows
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];
      
      // Keep template rows (1-3) and update data rows (4+)
      const templateRows = jsonData.slice(0, 3);
      
      // Convert edited data back to rows
      const updatedDataRows: string[][] = editedData.map(row => {
        return currentPreviewData.headers.map(header => row[header] || '');
      });

      // Combine template and updated data
      const allData = [...templateRows, ...updatedDataRows];

      // Create new worksheet
      const newWorksheet = XLSX.utils.aoa_to_sheet(allData);
      workbook.Sheets[sheetName] = newWorksheet;

      // Generate new blob
      const excelBuffer = XLSX.write(workbook, { 
        type: 'array', 
        bookType: 'xlsx',
      });

      const newBlob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // Update local state
      setUpdatedBlob(newBlob);
      
      // Update preview data to reflect changes
      const updatedPreviewData: ExcelPreviewData = {
        ...currentPreviewData,
        rows: editedData.map(row => ({ ...row })),
        totalRows: editedData.length,
      };
      setCurrentPreviewData(updatedPreviewData);
      
      // Notify parent component of updates
      if (onDataUpdate) {
        onDataUpdate(updatedPreviewData, newBlob);
      }
      
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving edits:', error);
      setUploadError('Failed to save edits');
    }
  };

  const handleCellChange = (rowIndex: number, header: string, value: string) => {
    setEditedData(prev => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...updated[rowIndex],
        [header]: value,
      };
      return updated;
    });
  };

  const handleUpload = async () => {
    const blobToUpload = updatedBlob || excelBlob;
    if (!blobToUpload) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const file = blobToFile(blobToUpload, filename);
      
      if (onUpload) {
        // Use custom upload handler if provided
        await onUpload(file);
        setUploadSuccess(true);
      } else {
        // Default upload to Giga Fedex
        const result = await uploadExcel(file);
        if (result.status === 'success' || result.status === 'processing') {
          setUploadSuccess(true);
        } else {
          throw new Error(result.message || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('Error uploading Excel:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload Excel file');
    } finally {
      setUploading(false);
    }
  };

  const handleNext = async () => {
    if (!onNext || !currentPreviewData) return;

    const blobToUse = updatedBlob || excelBlob;
    if (!blobToUse) return;

    setSavingOrders(true);
    try {
      // Prepare updated preview data with current state
      const updatedPreviewData: ExcelPreviewData = {
        ...currentPreviewData,
        rows: isEditMode ? editedData : currentPreviewData.rows,
      };

      // Call onNext with updated data and blob
      await onNext(updatedPreviewData, blobToUse);
    } catch (error) {
      console.error('Error in handleNext:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to proceed');
    } finally {
      setSavingOrders(false);
    }
  };

  // Check if all required fields are filled based on template requirements
  const checkRequiredFields = (): { isValid: boolean; missingFields: string[] } => {
    const dataToCheck = isEditMode ? editedData : (currentPreviewData?.rows || []);
    if (!currentPreviewData || dataToCheck.length === 0) {
      return { isValid: false, missingFields: ['No data to preview'] };
    }

    const missingFields: string[] = [];
    
    // Get required fields from lockedRows (requirements row - index 2 in template)
    // lockedRows[2] contains the requirements row
    const requirementsRow = currentPreviewData.lockedRows?.[2];
    const requiredFieldIndices: number[] = [];
    
    if (requirementsRow && currentPreviewData.headers) {
      // Find which headers are required by checking if requirements row starts with "Required;"
      currentPreviewData.headers.forEach((header, index) => {
        const requirement = requirementsRow[header];
        if (requirement && typeof requirement === 'string' && requirement.trim().startsWith('Required;')) {
          requiredFieldIndices.push(index);
        }
      });
    }

    // If we couldn't get requirements from lockedRows, use default required fields
    if (requiredFieldIndices.length === 0) {
      // Default required fields based on template
      const defaultRequiredFields = [
        'Shipping Warehouse',
        'Contact Name',
        'Address 1',
        'ZIP',
        'City',
        'State',
        'Country/Territory',
        'Phone No.',
        'Weight(lb)',
        'Length(in)',
        'Width(in)',
        'Height(in)'
      ];
      
      dataToCheck.forEach((row, rowIndex) => {
        defaultRequiredFields.forEach((field) => {
          const headerKey = currentPreviewData.headers.find(
            h => h.toLowerCase().trim() === field.toLowerCase().trim()
          );
          if (headerKey && (!row[headerKey] || String(row[headerKey]).trim() === '')) {
            missingFields.push(`Row ${rowIndex + 4}: ${field}`);
          }
        });
      });
    } else {
      // Use requirements from lockedRows
      dataToCheck.forEach((row, rowIndex) => {
        requiredFieldIndices.forEach((fieldIndex) => {
          const header = currentPreviewData.headers[fieldIndex];
          if (header && (!row[header] || String(row[header]).trim() === '')) {
            missingFields.push(`Row ${rowIndex + 4}: ${header}`);
          }
        });
      });
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
    };
  };

  const validation = checkRequiredFields();

  if (!isOpen || !currentPreviewData) return null;

  return (
    <div
      className="fixed inset-y-0 left-56 sm:left-64 right-0 z-120 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] flex flex-col animate-slide-up-and-scale m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet size={24} className="text-blue-600" />
              Excel Preview - {currentPreviewData.totalRows} Row{currentPreviewData.totalRows !== 1 ? 's' : ''}
              {isEditMode && <span className="text-sm font-normal text-purple-600">(Editing)</span>}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Review the data before downloading or uploading to Giga Fedex
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Validation Status */}
          <div className={`mb-4 p-4 rounded-lg border-2 ${
            validation.isValid
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {validation.isValid ? (
                <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  validation.isValid ? 'text-green-800' : 'text-red-800'
                }`}>
                  {validation.isValid
                    ? 'All required fields are filled ✓'
                    : `Missing ${validation.missingFields.length} required field${validation.missingFields.length !== 1 ? 's' : ''}. Please fill all required fields before proceeding.`}
                </p>
                {validation.missingFields.length > 0 && (
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside max-h-40 overflow-y-auto">
                    {validation.missingFields.map((field, idx) => (
                      <li key={idx}>{field}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-r border-slate-200">
                      Row
                    </th>
                    {currentPreviewData.headers.map((header, idx) => (
                      <th
                        key={idx}
                        className="px-3 py-2 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-r border-slate-200 last:border-r-0"
                      >
                        {header || `Column ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {/* Show locked rows (headers) if available */}
                  {'lockedRows' in currentPreviewData && currentPreviewData.lockedRows && currentPreviewData.lockedRows.length > 0 && (
                    <>
                      {currentPreviewData.lockedRows.map((row: Record<string, string>, rowIndex: number) => {
                        const isSectionRow = rowIndex === 0;
                        const isColumnHeaderRow = rowIndex === 1;
                        const rowLabel = isSectionRow ? 'Section Headers' : isColumnHeaderRow ? 'Column Headers' : 'Requirements';
                        const bgColor = isSectionRow ? 'bg-blue-50/30 border-blue-200' : isColumnHeaderRow ? 'bg-green-50/30 border-green-200' : 'bg-yellow-50/30 border-yellow-200';
                        const textColor = isSectionRow ? 'text-blue-700' : isColumnHeaderRow ? 'text-green-700' : 'text-yellow-700';
                        const accentColor = isSectionRow ? 'text-blue-500' : isColumnHeaderRow ? 'text-green-500' : 'text-yellow-500';
                        
                        return (
                        <tr
                          key={`header-${rowIndex}`}
                          className={`${bgColor} border-b`}
                        >
                          <td className={`px-3 py-2 text-xs font-bold ${textColor} border-r border-slate-200`}>
                            {rowIndex + 1}
                            <span className={`ml-1 text-[10px] ${accentColor}`}>
                              ({rowLabel})
                            </span>
                          </td>
                          {currentPreviewData.headers.map((header, colIndex) => {
                            const value = row[header] || '';
                            const isEmpty = value.trim() === '';
                            const cellTextColor = isSectionRow 
                              ? (isEmpty ? 'text-blue-400 italic' : 'text-blue-900 font-semibold')
                              : isColumnHeaderRow
                              ? (isEmpty ? 'text-green-400 italic' : 'text-green-900 font-semibold')
                              : (isEmpty ? 'text-yellow-400 italic' : 'text-yellow-900');
                            return (
                              <td
                                key={colIndex}
                                className={`px-3 py-2 text-xs font-medium border-r border-slate-200 last:border-r-0 ${cellTextColor}`}
                                title={value}
                              >
                                {isEmpty ? '(empty)' : value.length > 50 ? `${value.substring(0, 50)}...` : value}
                              </td>
                            );
                          })}
                        </tr>
                        );
                      })}
                      {/* Separator row */}
                      {editedData.length > 0 && (
                        <tr className="bg-slate-100">
                          <td colSpan={currentPreviewData.headers.length + 1} className="px-3 py-1 text-xs font-semibold text-slate-600 text-center">
                            ──── Data Rows {isEditMode ? '(Editing)' : ''} ────
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                  
                  {/* Data rows - editable when in edit mode */}
                  {(isEditMode ? editedData : currentPreviewData.rows).map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className={`hover:bg-slate-50 ${
                        rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                      } ${isEditMode ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="px-3 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">
                        {rowIndex + 4}
                      </td>
                      {currentPreviewData.headers.map((header, colIndex) => {
                        const value = isEditMode ? (editedData[rowIndex]?.[header] || '') : (row[header] || '');
                        const isEmpty = value.trim() === '';
                        
                        if (isEditMode) {
                          return (
                            <td
                              key={colIndex}
                              className="px-3 py-1 border-r border-slate-200 last:border-r-0"
                            >
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => handleCellChange(rowIndex, header, e.target.value)}
                                className="w-full px-2 py-1 text-xs text-slate-900 bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                placeholder="(empty)"
                              />
                            </td>
                          );
                        }
                        
                        return (
                          <td
                            key={colIndex}
                            className={`px-3 py-2 text-xs text-slate-900 border-r border-slate-200 last:border-r-0 ${
                              isEmpty ? 'text-slate-400 italic' : ''
                            }`}
                            title={value}
                          >
                            {isEmpty ? '(empty)' : value.length > 50 ? `${value.substring(0, 50)}...` : value}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Upload Status */}
          {uploadSuccess && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">
                    Excel file uploaded successfully!
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    The file has been uploaded to Giga Fedex. You can close this preview and proceed with BOL scraping if needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-red-600" />
                <p className="text-sm font-medium text-red-800">
                  {uploadError}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {!isEditMode ? (
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                <Edit2 size={18} />
                <span>Edit</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <Save size={18} />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <XCircle size={18} />
                  <span>Cancel</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
          <div className="flex items-center gap-3">
            {onNext && (
              <button
                type="button"
                onClick={handleNext}
                disabled={(!excelBlob && !updatedBlob) || savingOrders || isEditMode || !validation.isValid}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                  (excelBlob || updatedBlob) && !savingOrders && !isEditMode && validation.isValid
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {savingOrders ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!excelBlob && !updatedBlob}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                (excelBlob || updatedBlob)
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Download size={18} />
              <span>Download</span>
            </button>
            {!onNext && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={(!excelBlob && !updatedBlob) || uploading || !validation.isValid || isEditMode}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                  (excelBlob || updatedBlob) && !uploading && validation.isValid && !isEditMode
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Upload to Giga Fedex</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

