import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, PackageCheck, Filter, ShoppingCart, ExternalLink } from 'lucide-react';
import { searchLabTests } from '../lib/api';
import type { LabTestSearchResult, CartItem } from '../lib/types';

type SortField = 'search_result' | 'vocabulary_id' | 'searched_concept_class_id' | 'lab_test_type' | 'property' | 'scale' | 'system' | 'time';
type SortDirection = 'asc' | 'desc';

interface Step1LabTestSearchProps {
  addToCart: (item: CartItem) => void;
  removeFromCart: (hierarchyConceptId: number) => void;
  addMultipleToCart: (items: CartItem[]) => void;
  removeMultipleFromCart: (conceptIds: number[]) => void;
  shoppingCart: CartItem[];
}

export default function Step1LabTestSearch({
  addToCart,
  removeFromCart,
  addMultipleToCart,
  removeMultipleFromCart,
  shoppingCart,
}: Step1LabTestSearchProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<LabTestSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedVocabulary, setSelectedVocabulary] = useState<string>('');
  const [selectedLabTestType, setSelectedLabTestType] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedScale, setSelectedScale] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [textFilter, setTextFilter] = useState<string>('');

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResults([]);
    setSelectedVocabulary('');
    setSelectedLabTestType('');
    setSelectedProperty('');
    setSelectedScale('');
    setSelectedSystem('');
    setSelectedTime('');

    try {
      const data = await searchLabTests({
        searchterm: searchTerm.trim(),
      });

      setResults(data);

      if (data.length === 0) {
        setError('No lab tests found. Try a different search term.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lab test search failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle "Add to Cart" button click - toggles between add and remove
  const handleAddToCart = (result: LabTestSearchResult) => {
    const conceptId = result.term_concept;

    // If already in cart, remove it
    if (isInCart(result)) {
      removeFromCart(conceptId);
      return;
    }

    // Otherwise, add to cart
    const cartItem: CartItem = {
      hierarchy_concept_id: conceptId,
      concept_name: result.search_result,
      vocabulary_id: result.vocabulary_id,
      concept_class_id: result.searched_concept_class_id,
      root_term: result.search_result,
      domain_id: 'Measurement',
    };
    addToCart(cartItem);
  };

  // Check if item is already in cart
  const isInCart = (result: LabTestSearchResult) => {
    return shoppingCart.some((item) => item.hierarchy_concept_id === result.term_concept);
  };

  // Get unique values for filters
  const availableVocabularies = Array.from(new Set(results.map((r) => r.vocabulary_id))).sort();
  const availableLabTestTypes = Array.from(new Set(results.map((r) => r.lab_test_type))).sort();
  const availableProperties = Array.from(new Set(results.filter((r) => r.property).map((r) => r.property as string))).sort();
  const availableScales = Array.from(new Set(results.filter((r) => r.scale).map((r) => r.scale as string))).sort();
  const availableSystems = Array.from(new Set(results.filter((r) => r.system).map((r) => r.system as string))).sort();
  const availableTimes = Array.from(new Set(results.filter((r) => r.time).map((r) => r.time as string))).sort();

  // Apply filters
  let filteredResults = results.filter((result) => {
    if (selectedVocabulary && result.vocabulary_id !== selectedVocabulary) return false;
    if (selectedLabTestType && result.lab_test_type !== selectedLabTestType) return false;
    if (selectedProperty && result.property !== selectedProperty) return false;
    if (selectedScale && result.scale !== selectedScale) return false;
    if (selectedSystem && result.system !== selectedSystem) return false;
    if (selectedTime && result.time !== selectedTime) return false;
    if (textFilter && !result.search_result.toLowerCase().includes(textFilter.toLowerCase())) return false;
    return true;
  });

  // Apply sorting
  if (sortField) {
    filteredResults = [...filteredResults].sort((a, b) => {
      const aValue = a[sortField] || '';
      const bValue = b[sortField] || '';
      const comparison = aValue.toString().localeCompare(bValue.toString());
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-30" />;
    return sortDirection === 'asc' ?
      <ArrowUp className="w-3 h-3 inline ml-1 text-primary-600" /> :
      <ArrowDown className="w-3 h-3 inline ml-1 text-primary-600" />;
  };

  // Handle "Add All" button
  const handleAddAllFiltered = () => {
    const itemsToAdd = filteredResults
      .filter(result => !isInCart(result))
      .map(result => ({
        hierarchy_concept_id: result.term_concept,
        concept_name: result.search_result,
        vocabulary_id: result.vocabulary_id,
        concept_class_id: result.searched_concept_class_id,
        root_term: result.search_result,
        domain_id: 'Measurement' as const,
      }));

    if (itemsToAdd.length > 0) {
      addMultipleToCart(itemsToAdd);
    }
  };

  // Handle "Remove All" button
  const handleRemoveAllFiltered = () => {
    const idsToRemove = filteredResults
      .filter(result => isInCart(result))
      .map(result => result.term_concept);

    if (idsToRemove.length > 0) {
      removeMultipleFromCart(idsToRemove);
    }
  };

  // Count items in cart from filtered results
  const filteredInCartCount = filteredResults.filter(result => isInCart(result)).length;

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="card p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-2">
              Search Lab Tests
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="searchTerm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter lab test name, code, or concept ID..."
                className="input-field flex-1"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2 px-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Searches LOINC, CPT4, HCPCS, and SNOMED lab tests in Measurement domain. Leave empty for all results.
            </p>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <>
          {/* Filters */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">Filter Results</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Vocabulary Filter */}
              {availableVocabularies.length > 0 && (
                <div>
                  <label htmlFor="vocabulary" className="block text-xs font-medium text-gray-700 mb-1">
                    Vocabulary
                  </label>
                  <select
                    id="vocabulary"
                    value={selectedVocabulary}
                    onChange={(e) => setSelectedVocabulary(e.target.value)}
                    className="select-field text-sm w-full"
                  >
                    <option value="">All Vocabularies ({results.length})</option>
                    {availableVocabularies.map((vocab) => {
                      const count = results.filter((r) => r.vocabulary_id === vocab).length;
                      return (
                        <option key={vocab} value={vocab}>
                          {vocab} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Lab Test Type Filter */}
              {availableLabTestTypes.length > 0 && (
                <div>
                  <label htmlFor="labTestType" className="block text-xs font-medium text-gray-700 mb-1">
                    Test Type
                  </label>
                  <select
                    id="labTestType"
                    value={selectedLabTestType}
                    onChange={(e) => setSelectedLabTestType(e.target.value)}
                    className="select-field text-sm w-full"
                  >
                    <option value="">All Types ({results.length})</option>
                    {availableLabTestTypes.map((type) => {
                      const count = results.filter((r) => r.lab_test_type === type).length;
                      return (
                        <option key={type} value={type}>
                          {type} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Property Filter */}
              {availableProperties.length > 0 && (
                <div>
                  <label htmlFor="property" className="block text-xs font-medium text-gray-700 mb-1">
                    Property
                  </label>
                  <select
                    id="property"
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    className="select-field text-sm w-full"
                  >
                    <option value="">All Properties</option>
                    {availableProperties.map((prop) => {
                      const count = results.filter((r) => r.property === prop).length;
                      return (
                        <option key={prop} value={prop}>
                          {prop} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Scale Filter */}
              {availableScales.length > 0 && (
                <div>
                  <label htmlFor="scale" className="block text-xs font-medium text-gray-700 mb-1">
                    Scale
                  </label>
                  <select
                    id="scale"
                    value={selectedScale}
                    onChange={(e) => setSelectedScale(e.target.value)}
                    className="select-field text-sm w-full"
                  >
                    <option value="">All Scales</option>
                    {availableScales.map((scale) => {
                      const count = results.filter((r) => r.scale === scale).length;
                      return (
                        <option key={scale} value={scale}>
                          {scale} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* System Filter */}
              {availableSystems.length > 0 && (
                <div>
                  <label htmlFor="system" className="block text-xs font-medium text-gray-700 mb-1">
                    System
                  </label>
                  <select
                    id="system"
                    value={selectedSystem}
                    onChange={(e) => setSelectedSystem(e.target.value)}
                    className="select-field text-sm w-full"
                  >
                    <option value="">All Systems</option>
                    {availableSystems.map((sys) => {
                      const count = results.filter((r) => r.system === sys).length;
                      return (
                        <option key={sys} value={sys}>
                          {sys} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Time Filter */}
              {availableTimes.length > 0 && (
                <div>
                  <label htmlFor="time" className="block text-xs font-medium text-gray-700 mb-1">
                    Time Aspect
                  </label>
                  <select
                    id="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="select-field text-sm w-full"
                  >
                    <option value="">All Time Aspects</option>
                    {availableTimes.map((time) => {
                      const count = results.filter((r) => r.time === time).length;
                      return (
                        <option key={time} value={time}>
                          {time} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Text Filter */}
              <div>
                <label htmlFor="textFilter" className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by Name
                </label>
                <input
                  type="text"
                  id="textFilter"
                  value={textFilter}
                  onChange={(e) => setTextFilter(e.target.value)}
                  placeholder="Filter results..."
                  className="input-field text-sm w-full"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
              <span>
                Showing {filteredResults.length} of {results.length} results
                {filteredInCartCount > 0 && ` (${filteredInCartCount} in cart)`}
              </span>
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleAddAllFiltered}
                  disabled={filteredResults.length === 0 || filteredResults.every(r => isInCart(r))}
                  className="text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add All Filtered
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleRemoveAllFiltered}
                  disabled={filteredInCartCount === 0}
                  className="text-red-600 hover:text-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove All Filtered
                </button>
                {shoppingCart.length > 0 && (
                  <>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => navigate('/codeset')}
                      className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
                    >
                      <PackageCheck className="w-3 h-3" />
                      Build ({shoppingCart.length})
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="card p-0">
            <div className="overflow-x-auto">
              <table className="table compact-table">
                <thead>
                  <tr>
                    <th className="text-xs py-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('lab_test_type')}>
                      Type {getSortIcon('lab_test_type')}
                    </th>
                    <th className="text-xs py-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('search_result')}>
                      Lab Test Name {getSortIcon('search_result')}
                    </th>
                    <th className="text-xs py-2">Code</th>
                    <th className="text-xs py-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('vocabulary_id')}>
                      Vocabulary {getSortIcon('vocabulary_id')}
                    </th>
                    <th className="text-xs py-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('property')}>
                      Property {getSortIcon('property')}
                    </th>
                    <th className="text-xs py-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('scale')}>
                      Scale {getSortIcon('scale')}
                    </th>
                    <th className="text-xs py-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('system')}>
                      System {getSortIcon('system')}
                    </th>
                    <th className="text-xs py-2 cursor-pointer hover:bg-gray-50" onClick={() => handleSort('time')}>
                      Time {getSortIcon('time')}
                    </th>
                    <th className="w-20 text-xs py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((result) => (
                    <tr key={`${result.term_concept}-${result.vocabulary_id}`} className="hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <span className={`badge text-xs px-2 py-0.5 ${
                          result.lab_test_type === 'Panel' ? 'badge-info' : 'badge-success'
                        }`}>
                          {result.lab_test_type}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-medium text-sm">
                        <div className="flex items-center gap-1">
                          <span>{result.search_result}</span>
                          <a
                            href={`https://athena.ohdsi.org/search-terms/terms/${result.term_concept}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700"
                            title="View code in Athena."
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="py-2 px-2 font-mono text-xs">{result.searched_code}</td>
                      <td className="py-2 px-2">
                        <span className="badge badge-primary text-xs px-2 py-0.5">
                          {result.vocabulary_id}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-gray-600">{result.property || '-'}</td>
                      <td className="py-2 px-2 text-xs text-gray-600">{result.scale || '-'}</td>
                      <td className="py-2 px-2 text-xs text-gray-600">{result.system || '-'}</td>
                      <td className="py-2 px-2 text-xs text-gray-600">{result.time || '-'}</td>
                      <td className="py-2 px-2">
                        <button
                          onClick={() => handleAddToCart(result)}
                          className={`btn-sm flex items-center gap-1 ${
                            isInCart(result)
                              ? 'bg-primary-600 text-white hover:bg-primary-700'
                              : 'btn-secondary'
                          }`}
                        >
                          <ShoppingCart className="w-3 h-3" />
                          {isInCart(result) ? 'Added' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Go to Build Button */}
          {shoppingCart.length > 0 && (
            <div className="card p-4 bg-primary-50 border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {shoppingCart.length} lab test{shoppingCart.length !== 1 ? 's' : ''} in cart
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Ready to build your lab test code set
                  </p>
                </div>
                <button
                  onClick={() => navigate('/codeset')}
                  className="btn-primary flex items-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" />
                  Go to Build
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
