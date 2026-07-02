import React, { useState, useEffect } from 'react';
import { getPricingConfig, updatePricingConfig } from '../../api/pricing.api';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';
import { Calculator } from 'lucide-react';

export default function PriceConfiguration() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fuel_price: 0,
    diesel_price: 0,
    price_per_km: 7,
    platform_commission_percentage: 10,
    platform_fixed_fee: 0,
    vehicle_maintenance_charge: 0,
    driver_incentive: 0,
    service_charge: 0,
    gst_percentage: 0,
    peak_hour_charge: 0,
    night_charge: 0,
    traffic_charge: 0,
    waiting_charge: 0,
    minimum_fare: 0,
    maximum_fare: 100000,
    discount_percentage: 0,
    round_off_method: 'nearest_50',
    base_fare: 0,
    vehicle_multipliers: { hatchback: 1.0, sedan: 1.0, suv: 1.0, van: 1.0 },
    admin_upi_id: 'admin@upi'
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await getPricingConfig();
      if (res.data) {
        let parsedMultipliers = { hatchback: 1.0, sedan: 1.3, suv: 1.8, van: 2.0 };
        if (res.data.vehicle_multipliers) {
          try {
            parsedMultipliers = typeof res.data.vehicle_multipliers === 'string' 
              ? JSON.parse(res.data.vehicle_multipliers) 
              : res.data.vehicle_multipliers;
          } catch(e){}
        }
        setForm(prev => ({ ...prev, ...res.data, vehicle_multipliers: parsedMultipliers }));
      }
    } catch (err) {
      toast.error('Failed to load pricing configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: (name === 'round_off_method' || name === 'admin_upi_id') ? value : Number(value)
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const payload = {
        ...form,
        fuel_price: 0,
        diesel_price: 0,
        base_fare: 0,
        platform_fixed_fee: 0,
        vehicle_maintenance_charge: 0,
        driver_incentive: 0,
        service_charge: 0,
        gst_percentage: 0,
        peak_hour_charge: 0,
        night_charge: 0,
        traffic_charge: 0,
        waiting_charge: 0,
        minimum_fare: 0,
        discount_percentage: 0,
        vehicle_multipliers: { hatchback: 1.0, sedan: 1.0, suv: 1.0, van: 1.0 }
      };

      await updatePricingConfig(payload);
      toast.success('Pricing Configuration saved successfully!');
    } catch (err) {
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">Price Configuration</h1>
        <p className="text-gray-500">Manage automatic pricing rules and variables</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Pricing Configuration">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Price Per KM (₹)</label>
              <input type="number" name="price_per_km" value={form.price_per_km} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Platform Commission (%)</label>
              <input type="number" name="platform_commission_percentage" value={form.platform_commission_percentage} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin UPI ID</label>
              <input type="text" name="admin_upi_id" value={form.admin_upi_id} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-lg p-2 focus:border-primary-600 focus:ring-1 focus:ring-primary-600" placeholder="e.g. smartride@sbi" />
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 flex gap-4">
        <Button onClick={handleSave} disabled={saving} variant="primary">
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
}
