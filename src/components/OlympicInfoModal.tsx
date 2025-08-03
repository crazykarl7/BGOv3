import React from 'react';
import { format } from 'date-fns';
import { Olympic } from '../types/database';

interface OlympicInfoModalProps {
  olympic: Olympic;
  onClose: () => void;
}

export default function OlympicInfoModal({ olympic, onClose }: OlympicInfoModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{olympic.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>
        <div className="mb-4 text-gray-600">
          <p>Date: {format(new Date(olympic.date), 'MMMM d, yyyy')}</p>
          <p>Registration Deadline: {format(new Date(olympic.registration_deadline), 'MMMM d, yyyy')}</p>
        </div>
        {olympic.description && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: olympic.description }}
          />
        )}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}