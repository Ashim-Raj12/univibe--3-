import React, { useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import Spinner from "./Spinner";

interface PostAssignmentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PostAssignmentModal: React.FC<PostAssignmentModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size cannot exceed 10MB.");
        return;
      }
      setError(null);
      setFile(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !user ||
      !profile ||
      !title.trim() ||
      !description.trim() ||
      !price.trim()
    ) {
      setError("Title, Description, and Pay are required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const filePath = `assignments/${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("community-files")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("community-files")
          .getPublicUrl(uploadData.path);
        fileUrl = publicUrl;
        fileName = file.name;
      }

      const { error: insertError } = await supabase.from("assignments").insert({
        title,
        description,
        price: parseFloat(price) || 0,
        due_date: dueDate || null,
        poster_id: user.id,
        college: profile.college,
        file_url: fileUrl,
        file_name: fileName,
      });

      if (insertError) throw insertError;

      onSuccess();
    } catch (e: any) {
      const errorMessage =
        e instanceof Error ? e.message : "An unknown error occurred.";
      setError(`Post failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "w-full px-4 py-2.5 bg-transparent border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text-heading placeholder:text-text-muted transition-all duration-300 h-[44px]";

  const labelClasses = "block text-sm font-medium text-text-body mb-2";

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={onClose}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <div
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl z-10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-text-heading">
            Post an Assignment
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-heading transition-colors"
            type="button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="overflow-y-auto flex-1">
          <form
            id="assignment-form"
            onSubmit={handleSubmit}
            className="p-6 space-y-6"
          >
            {/* Title Field */}
            <div>
              <label className={labelClasses} htmlFor="title-input">
                Title
              </label>
              <input
                id="title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClasses}
                placeholder="Enter assignment title"
                required
              />
            </div>

            {/* Description Field */}
            <div>
              <label className={labelClasses} htmlFor="description-input">
                Description
              </label>
              <textarea
                id="description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClasses} h-auto`}
                rows={4}
                placeholder="Detailed description of the assignment..."
                required
              ></textarea>
            </div>

            {/* Pay and Due Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Pay Field */}
              <div>
                <label className={labelClasses} htmlFor="price-input">
                  Pay (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-text-muted pointer-events-none">
                    ₹
                  </span>
                  <input
                    id="price-input"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`${inputClasses} pl-8`}
                    placeholder="1500.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              {/* Due Date Field */}
              <div>
                <label className={labelClasses} htmlFor="due-date-input">
                  Due Date
                </label>
                <input
                  id="due-date-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClasses}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            {/* Attachment Field */}
            <div>
              <label className={labelClasses}>Attachment (Optional)</label>
              <div className="mt-2 flex justify-center px-6 pt-5 pb-5 border-2 border-slate-300 border-dashed rounded-xl hover:border-slate-400 transition-colors">
                <div className="space-y-2 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-text-muted"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {file ? (
                    <div className="flex items-center gap-2 text-sm text-text-body justify-center">
                      <p className="font-semibold truncate max-w-[200px]">
                        {file.name}
                      </p>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-red-500 hover:text-red-700 font-bold text-xl leading-none"
                        title="Remove file"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div className="flex text-sm text-text-body justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-transparent rounded-md font-medium text-primary hover:text-primary-focus focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.rar,.txt,image/*"
                        />
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-text-muted">
                    PDF, DOC, PPT, ZIP, Image up to 10MB
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm text-center font-medium">
                  {error}
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-100 text-text-body px-6 py-2.5 rounded-xl hover:bg-slate-200 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="assignment-form"
            disabled={loading}
            className="bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary-focus transition-all duration-300 disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
          >
            {loading ? <Spinner size="sm" /> : "Post"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PostAssignmentModal;