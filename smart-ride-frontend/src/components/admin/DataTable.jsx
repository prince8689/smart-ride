import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

const DataTable = ({ columns, data, isLoading, emptyMessage, onRowClick, pagination = true }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Sorting
  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle nested properties if key has a dot (e.g., 'user.full_name')
        if (sortConfig.key.includes('.')) {
          const keys = sortConfig.key.split('.');
          aValue = keys.reduce((obj, k) => (obj || {})[k], a);
          bValue = keys.reduce((obj, k) => (obj || {})[k], b);
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const currentData = pagination 
    ? sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : sortedData;

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl border border-navy-100 overflow-hidden shadow-sm">
        <div className="animate-pulse">
          <div className="h-12 bg-navy-50 border-b border-navy-100"></div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-16 border-b border-navy-50 flex items-center px-6 gap-4">
              <div className="h-4 bg-navy-100 rounded w-1/4"></div>
              <div className="h-4 bg-navy-100 rounded w-1/4"></div>
              <div className="h-4 bg-navy-100 rounded w-1/4"></div>
              <div className="h-4 bg-navy-100 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-navy-100 p-8 shadow-sm">
        <EmptyState title="No Data Found" description={emptyMessage || "There are no records to display."} />
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl border border-navy-100 overflow-hidden shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-navy-50 border-b border-navy-200">
            <tr>
              {columns.map((col, index) => (
                <th 
                  key={index} 
                  className={`px-4 py-3 text-xs font-bold text-navy-600 uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:bg-navy-100 select-none' : ''} ${col.width || ''}`}
                  onClick={() => col.sortable && requestSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                    {col.label}
                    {col.sortable && sortConfig.key === col.key && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={14} className="text-primary-600" /> : <ChevronDown size={14} className="text-primary-600" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {currentData.map((row, rowIndex) => (
              <tr 
                key={row.id || rowIndex} 
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-primary-50/50' : 'hover:bg-navy-50/30'}`}
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className={`px-4 py-4 text-sm text-navy-900 ${col.align === 'right' ? 'text-right' : ''}`}>
                    {col.render ? col.render(row) : (
                      // Handle nested keys safely
                      col.key?.includes('.') 
                        ? col.key.split('.').reduce((obj, k) => (obj || {})[k], row)
                        : row[col.key]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-navy-100 bg-navy-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-navy-600">
            <span>Show</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-navy-200 rounded px-2 py-1 outline-none focus:border-primary-500"
            >
              {[10, 20, 50, 100].map(val => <option key={val} value={val}>{val}</option>)}
            </select>
            <span>entries</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded text-navy-600 hover:bg-navy-200 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-navy-700 px-3">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded text-navy-600 hover:bg-navy-200 disabled:opacity-50 disabled:hover:bg-transparent"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
