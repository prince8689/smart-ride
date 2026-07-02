import { toast as hotToast } from 'react-hot-toast';
import React from 'react';

const customToast = (message, options) => hotToast(message, options);

customToast.success = (message, options = {}) => hotToast.success(message, {
  iconTheme: { primary: '#2563EB', secondary: '#fff' },
  ...options
});

customToast.error = (message, options = {}) => hotToast.error(message, {
  duration: 5000,
  iconTheme: { primary: '#ef4444', secondary: '#fff' },
  ...options
});

customToast.loading = (message) => hotToast.loading(message, {
  iconTheme: { primary: '#2563EB', secondary: '#f1f5f9' }
});

customToast.info = (message, options = {}) => hotToast(message, {
  duration: 4000,
  icon: 'ℹ️',
  ...options
});

customToast.warning = (message, options = {}) => hotToast(message, {
  duration: 5000,
  icon: '⚠️',
  ...options
});

customToast.promise = (promise, { loading, success, error }) => hotToast.promise(promise, { loading, success, error });

customToast.dismiss = (id) => hotToast.dismiss(id);

customToast.payment = (amount, invoiceNumber) => hotToast.custom((t) => (
  <div
    className={`${
      t.visible ? 'animate-enter' : 'animate-leave'
    } max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
  >
    <div className="flex-1 w-0 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-bold text-gray-900">
            Payment of ₹{amount} successful
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Invoice: {invoiceNumber}
          </p>
        </div>
      </div>
    </div>
    <div className="flex border-l border-gray-200">
      <button
        onClick={() => hotToast.dismiss(t.id)}
        className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-600 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        Close
      </button>
    </div>
  </div>
), { duration: 6000 });

export default customToast;
