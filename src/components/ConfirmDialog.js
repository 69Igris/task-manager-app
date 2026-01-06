'use client';

import { createContext, useContext, useState } from 'react';

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger', // 'danger' or 'warning'
  });

  const showConfirm = ({
    title = 'Confirm Action',
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
  }) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        type,
        onConfirm: () => {
          if (onConfirm) onConfirm();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          if (onCancel) onCancel();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {confirmState.isOpen && (
        <div 
          className="fixed inset-0 z-[120] overflow-y-auto"
          onClick={(e) => {
            // Only close if clicking directly on the backdrop, not on modal content
            if (e.target === e.currentTarget) {
              confirmState.onCancel();
            }
          }}
        >
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
            ></div>

            {/* Center modal */}
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>

            <div 
              className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 animate-slide-up relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sm:flex sm:items-start">
                <div
                  className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                    confirmState.type === 'danger'
                      ? 'bg-red-100'
                      : 'bg-yellow-100'
                  }`}
                >
                  <svg
                    className={`h-6 w-6 ${
                      confirmState.type === 'danger'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900">
                    {confirmState.title}
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {confirmState.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    confirmState.onConfirm();
                  }}
                  className={`inline-flex w-full justify-center rounded-md px-4 py-2.5 text-base font-semibold text-white shadow-sm sm:w-auto sm:text-sm touch-manipulation ${
                    confirmState.type === 'danger'
                      ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 focus:ring-red-500'
                      : 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 focus:ring-yellow-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                >
                  {confirmState.confirmText}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    confirmState.onCancel();
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-4 py-2.5 text-base font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 active:bg-gray-100 sm:mt-0 sm:w-auto sm:text-sm touch-manipulation"
                >
                  {confirmState.cancelText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
