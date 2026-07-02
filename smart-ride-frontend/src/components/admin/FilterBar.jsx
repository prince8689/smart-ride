import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';

const FilterBar = ({ filters, onChange }) => {
  const [filterValues, setFilterValues] = useState(
    filters.reduce((acc, f) => ({ ...acc, [f.key]: f.defaultValue || '' }), {})
  );
  
  const [searchVal, setSearchVal] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filterValues, search: searchVal });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchVal]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key, val) => {
    const newVals = { ...filterValues, [key]: val };
    setFilterValues(newVals);
    onChange({ ...newVals, search: searchVal });
  };

  const clearFilters = () => {
    const reset = filters.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
    setFilterValues(reset);
    setSearchVal('');
    onChange({ ...reset, search: '' });
  };

  const hasActiveFilters = searchVal !== '' || Object.values(filterValues).some(v => v !== '');

  return (
    <div className="bg-white p-4 rounded-xl border border-navy-100 shadow-sm mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-navy-200 rounded-xl outline-none focus:border-primary-500 transition-colors"
          />
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden flex items-center justify-center gap-2 py-2 border border-navy-200 rounded-xl text-navy-600 font-medium"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <Filter size={18} /> Filters {hasActiveFilters && <div className="w-2 h-2 rounded-full bg-primary-600"></div>}
        </button>

        {/* Filters */}
        <div className={`${isMobileOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row gap-4 flex-wrap`}>
          {filters.map(filter => {
            if (filter.type === 'select') {
              return (
                <select
                  key={filter.key}
                  value={filterValues[filter.key]}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="px-4 py-2 border border-navy-200 rounded-xl outline-none focus:border-primary-500 bg-white min-w-[140px]"
                >
                  <option value="">All {filter.label}</option>
                  {filter.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              );
            }
            if (filter.type === 'date') {
              return (
                <input
                  key={filter.key}
                  type="date"
                  value={filterValues[filter.key]}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="px-4 py-2 border border-navy-200 rounded-xl outline-none focus:border-primary-500 bg-white"
                  title={filter.label}
                />
              );
            }
            return null;
          })}

          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-1 transition-colors"
            >
              <X size={16} /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
