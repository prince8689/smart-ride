import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import StarRating from './StarRating';
import api from '../../api/axios';
import toast from '../../utils/toastConfig';

export default function RateDriverModal({ isOpen, onClose, subscription }) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState(null);

  // Check if already rated when modal opens
  useEffect(() => {
    if (isOpen && subscription?.id) {
      setRating(0);
      setReview('');
      setExistingRating(null);
      // In a real scenario, checkCanRate would be called by the parent, but here we can check or just let backend handle duplicates.
    }
  }, [isOpen, subscription]);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    
    try {
      const res = await api.post('/ratings', {
        subscription_id: subscription.id,
        rating,
        review
      });
      
      if (res.data.success) {
        toast.success('Thank you for your rating!');
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!subscription) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Ride">
      <div className="flex flex-col items-center py-4">
        <Avatar 
          name={subscription.driver_name || 'Driver'} 
          size="lg" 
          className="mb-4 shadow-md border-4 border-white"
        />
        <h3 className="text-lg font-bold text-navy-900 mb-1">
          How was your ride with {subscription.driver_name || 'your driver'}?
        </h3>
        <p className="text-sm text-navy-500 mb-6 text-center">
          Your feedback helps us improve our service and rewards top drivers.
        </p>

        {existingRating ? (
          <div className="bg-navy-50 p-6 rounded-2xl w-full text-center">
            <h4 className="font-bold text-navy-900 mb-2">You rated this ride</h4>
            <div className="flex justify-center mb-4">
              <StarRating rating={existingRating.rating} size="lg" />
            </div>
            {existingRating.review && (
              <p className="text-navy-600 italic">"{existingRating.review}"</p>
            )}
          </div>
        ) : (
          <div className="w-full">
            <div className="flex justify-center mb-8">
              <StarRating 
                interactive 
                maxStars={5} 
                size="lg" 
                rating={rating} 
                onRate={setRating} 
              />
            </div>

            <div className="mb-6 relative">
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Share your experience (optional)
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value.slice(0, 500))}
                placeholder="Was the driver on time? Was the car clean?"
                className="w-full border-2 border-navy-100 rounded-xl p-3 focus:border-primary-500 focus:ring-0 text-navy-900 resize-none h-24"
              />
              <span className="absolute bottom-3 right-3 text-xs text-navy-400">
                {review.length}/500
              </span>
            </div>

            <Button 
              fullWidth 
              onClick={handleSubmit} 
              disabled={rating === 0 || isSubmitting}
              isLoading={isSubmitting}
            >
              Submit Rating
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
