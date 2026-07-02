import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import Button from '../ui/Button';

export default function AdvancedSearch({ 
  placeholder = "Search...", 
  onSearch, 
  filtersConfig = [], 
  initialFilters = {} 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch({ search: searchTerm, ...filters });
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, filters]);

  useEffect(() => {
    let count = 0;
    Object.keys(filters).forEach(key => {
      if (filters[key] !== '' && filters[key] !== 'all' && filters[key] !== null) {
        count++;
      }
    });
    setActiveFilterCount(count);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
    onSearch({ search: '' });
    setIsFilterOpen(false);
  };

  return (
    <div className="w-full relative mb-6">
      <div className="flex flex-col sm:flex-row gap-3 relative z-20">
        <div className="relative flex-1 group">
          <input
            type="text"
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border-2 border-navy-100 rounded-2xl text-navy-900 outline-none transition-all focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 shadow-sm group-hover:shadow-md"
          />
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400 group-focus-within:text-primary-500 transition-colors" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {filtersConfig.length > 0 && (
          <Button 
            variant={isFilterOpen || activeFilterCount > 0 ? 'primary' : 'outline'} 
            className={`sm:w-auto shrink-0 relative ${!isFilterOpen && activeFilterCount === 0 ? 'bg-white' : ''}`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <SlidersHorizontal size={18} className="mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {activeFilterCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Expandable Filter Panel */}
      {filtersConfig.length > 0 && (
        <div className={`overflow-hidden transition-all duration-300 ease-in-out absolute w-full left-0 z-10 ${
          isFilterOpen ? 'max-h-96 opacity-100 translate-y-2' : 'max-h-0 opacity-0 -translate-y-4 pointer-events-none'
        }`}>
          <div className="bg-white border border-navy-100 shadow-xl rounded-2xl p-5 md:p-6">
            <div className="flex justify-between items-center mb-4 border-b border-navy-50 pb-3">
              <h3 className="font-bold text-navy-900">Advanced Filters</h3>
              <button 
                onClick={handleClearFilters}
                className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtersConfig.map((config) => (
                <div key={config.key} className="space-y-1.5">
                  <label className="text-xs font-bold text-navy-500 uppercase tracking-wider">
                    {config.label}
                  </label>
                  
                  {config.type === 'select' && (
                    <select
                      value={filters[config.key] || 'all'}
                      onChange={(e) => handleFilterChange(config.key, e.target.value)}
                      className="w-full p-2.5 bg-navy-50 border border-navy-100 rounded-xl text-sm font-medium text-navy-900 outline-none focus:border-primary-400 focus:bg-white transition-all cursor-pointer"
                    >
                      {config.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {config.type === 'number_range' && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={filters[`${config.key}_min`] || ''}
                        onChange={(e) => handleFilterChange(`${config.key}_min`, e.target.value)}
                        className="w-full p-2.5 bg-navy-50 border border-navy-100 rounded-xl text-sm font-medium outline-none focus:border-primary-400 focus:bg-white"
                      />
                      <span className="text-navy-300">-</span>
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={filters[`${config.key}_max`] || ''}
                        onChange={(e) => handleFilterChange(`${config.key}_max`, e.target.value)}
                        className="w-full p-2.5 bg-navy-50 border border-navy-100 rounded-xl text-sm font-medium outline-none focus:border-primary-400 focus:bg-white"
                      />
                    </div>
                  )}

                  {config.type === 'radio' && (
                    <div className="flex flex-wrap gap-2">
                      {config.options.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleFilterChange(config.key, opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            (filters[config.key] || 'all') === opt.value 
                              ? 'bg-primary-100 text-primary-700 border-2 border-primary-200'
                              : 'bg-white text-navy-600 border-2 border-navy-100 hover:bg-navy-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button size="sm" onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
