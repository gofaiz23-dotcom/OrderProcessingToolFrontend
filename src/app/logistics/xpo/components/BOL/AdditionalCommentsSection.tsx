'use client';

type AdditionalCommentsSectionProps = {
  comments: string;
  onCommentsChange: (value: string) => void;
};

export const AdditionalCommentsSection = ({
  comments,
  onCommentsChange,
}: AdditionalCommentsSectionProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Additional Comments/Remarks</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-900">
          Remark
        </label>
        <textarea
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter any additional comments or remarks..."
        />
      </div>
    </div>
  );
};

