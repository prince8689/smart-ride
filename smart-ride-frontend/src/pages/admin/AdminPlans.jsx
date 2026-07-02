import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, X, Tag, IndianRupee } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { createPlan, updatePlan } from '../../api/admin.api';
import { getAllPlans } from '../../api/subscription.api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { formatCurrency } from '../../utils/helpers';

const AdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { features: [{ value: '' }] }
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: 'features' });
  const planType = watch('type');

  // Auto-set duration based on type
  useEffect(() => {
    if (planType === 'monthly') setValue('duration_days', 30);
    else if (planType === 'quarterly') setValue('duration_days', 90);
    else if (planType === 'yearly') setValue('duration_days', 365);
  }, [planType, setValue]);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      // Pass true to get inactive plans too
      const res = await getAllPlans(true);
      if (res.success) setPlans(res.data);
    } catch (err) {
      toast.error('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreate = () => {
    setEditingPlan(null);
    reset({
      name: '', type: 'monthly', duration_days: 30, price: '',
      features: [{ value: 'Fixed daily pickup & drop' }, { value: 'Dedicated driver' }],
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEdit = (plan) => {
    setEditingPlan(plan);
    let parsed = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
    let list = Array.isArray(parsed) ? parsed : Object.entries(parsed || {}).filter(([k,v]) => v).map(([k]) => k.replace(/_/g, ' '));
    const formattedFeatures = list.map(f => ({ value: f }));
      
    reset({
      ...plan,
      features: formattedFeatures
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        features: data.features.map(f => f.value).filter(f => f.trim() !== '')
      };
      
      let res;
      if (editingPlan) {
        res = await updatePlan(editingPlan.id, payload);
      } else {
        res = await createPlan(payload);
      }
      
      if (res.success) {
        toast.success(`Plan ${editingPlan ? 'updated' : 'created'} successfully`);
        setIsModalOpen(false);
        fetchPlans();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save plan');
    }
  };

  const toggleStatus = async (plan) => {
    try {
      const res = await updatePlan(plan.id, { is_active: !plan.is_active });
      if (res.success) {
        toast.success(`Plan ${!plan.is_active ? 'activated' : 'deactivated'}`);
        setPlans(plans.map(p => p.id === plan.id ? { ...p, is_active: !plan.is_active } : p));
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) return <div className="flex h-[60vh] justify-center items-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 border-b border-navy-100 pb-4">
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <Tag size={24} className="text-primary-600" /> Subscription Plans
        </h1>
        <Button leftIcon={<Plus size={18} />} onClick={openCreate}>Create Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.id} className={`p-6 flex flex-col relative overflow-hidden ${!plan.is_active ? 'opacity-70 bg-gray-50' : ''}`}>
            {!plan.is_active && (
              <div className="absolute top-4 right-4 bg-gray-200 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">INACTIVE</div>
            )}
            
            <div className="mb-4">
              <Badge color="blue" className="mb-2 capitalize">{plan.type}</Badge>
              <h3 className="text-xl font-bold text-navy-900">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black text-navy-900">{formatCurrency(plan.price)}</span>
                <span className="text-sm font-medium text-navy-500">/ {plan.duration_days} days</span>
              </div>
            </div>

            <div className="flex-1 bg-navy-50 p-4 rounded-xl border border-navy-100 mb-6 space-y-2">
              {(() => {
                let f = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
                let list = Array.isArray(f) ? f : Object.entries(f || {}).filter(([k,v]) => v).map(([k]) => k.replace(/_/g, ' '));
                return list.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-navy-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0"></div>
                    <span className="capitalize">{feat}</span>
                  </div>
                ));
              })()}
            </div>

            <div className="flex gap-3 mt-auto">
              <Button variant={plan.is_active ? "outline" : "primary"} className="flex-1" onClick={() => toggleStatus(plan)}>
                {plan.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button className="flex-1 bg-navy-800 hover:bg-navy-900" onClick={() => openEdit(plan)}>
                Edit Plan
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlan ? 'Edit Plan' : 'Create Plan'} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Plan Name" placeholder="e.g. Monthly Standard" {...register('name', { required: 'Required' })} error={errors.name?.message} />
            <div>
              <label className="text-sm font-bold text-navy-900 block mb-1">Plan Type</label>
              <select className="w-full border border-navy-200 rounded-xl p-3 outline-none focus:border-primary-500 bg-white" {...register('type')}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (Days)" type="number" {...register('duration_days', { required: 'Required', valueAsNumber: true })} error={errors.duration_days?.message} />
            <Input label="Price (₹)" type="number" leftIcon={<IndianRupee size={16}/>} {...register('price', { required: 'Required', valueAsNumber: true })} error={errors.price?.message} />
          </div>

          <div className="border border-navy-100 p-4 rounded-xl bg-navy-50">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-navy-900">Features</label>
              <button type="button" onClick={() => append({ value: '' })} className="text-xs font-bold text-primary-600 hover:bg-primary-50 px-2 py-1 rounded">
                + Add Feature
              </button>
            </div>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...register(`features.${index}.value`, { required: true })}
                    className="flex-1 border border-navy-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary-500"
                    placeholder="Enter feature description..."
                  />
                  <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-white border border-navy-200 rounded-xl">
            <input type="checkbox" id="is_active" {...register('is_active')} className="w-4 h-4 text-primary-600 rounded" />
            <label htmlFor="is_active" className="text-sm font-medium text-navy-900 cursor-pointer">Plan is active and visible to users</label>
          </div>

          <div className="pt-4 flex gap-3 border-t border-navy-100">
            <Button type="button" variant="outline" fullWidth onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" fullWidth isLoading={isSubmitting}>{editingPlan ? 'Update Plan' : 'Create Plan'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPlans;
