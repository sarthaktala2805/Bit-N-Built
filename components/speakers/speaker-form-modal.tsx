"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Speaker } from "@/types";
import { validateSpeaker } from "@/lib/validation";
import { useEventStore } from "@/store/event-store";
import { Upload, X } from "lucide-react";

interface SpeakerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  speakerToEdit?: Speaker | null;
  eventId: string;
}

export const SpeakerFormModal: React.FC<SpeakerFormModalProps> = ({
  isOpen,
  onClose,
  speakerToEdit,
  eventId,
}) => {
  const { addSpeaker, updateSpeaker } = useEventStore();

  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    organization: "",
    bio: "",
    image: null as string | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (speakerToEdit) {
      setFormData({
        name: speakerToEdit.name,
        designation: speakerToEdit.designation || "",
        organization: speakerToEdit.organization || "",
        bio: speakerToEdit.bio || "",
        image: speakerToEdit.image || null,
      });
    } else {
      setFormData({
        name: "",
        designation: "",
        organization: "",
        bio: "",
        image: null,
      });
    }
    setErrors({});
  }, [speakerToEdit, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors({ image: "Please select an image file." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Downscale image to max 200px width/height to stay within LocalStorage limits (~50KB)
        const canvas = document.createElement("canvas");
        const maxDim = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setFormData((prev) => ({ ...prev, image: dataUrl }));
        setErrors((prev) => ({ ...prev, image: "" }));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const val = validateSpeaker(formData);
    if (!val.valid) {
      setErrors(val.errors);
      return;
    }

    if (speakerToEdit) {
      const res = updateSpeaker(speakerToEdit.id, formData);
      if (!res.ok) {
        setErrors({ form: res.error || "Failed to update speaker." });
        return;
      }
    } else {
      const res = addSpeaker({
        ...formData,
        eventId,
      });
      if (!res.ok) {
        setErrors({ form: res.error || "Failed to add speaker." });
        return;
      }
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={speakerToEdit ? "Edit Speaker Profile" : "Add Speaker"}
      description="Enter speaker credentials and bio. This information directly grounds AI speaker introduction scripts."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            {errors.form}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Full Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Dr. Jane Smith"
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
          {errors.name && <p className="text-[11px] text-rose-400 mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Designation / Title
            </label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="e.g. Head of AI Research"
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Organization
            </label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              placeholder="e.g. Google DeepMind"
              className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Short Biography (Used for contextual introductions)
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
            placeholder="Key achievements, topics of expertise, or background summary..."
            className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-slate-600"
          />
          {errors.bio && <p className="text-[11px] text-rose-400 mt-1">{errors.bio}</p>}
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Photo (Optional, automatically optimized)
          </label>
          {formData.image ? (
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-700 bg-slate-800 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formData.image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, image: null })}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Remove photo
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                id="speaker-image"
                className="sr-only"
              />
              <label
                htmlFor="speaker-image"
                className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload speaker photo
              </label>
            </div>
          )}
          {errors.image && <p className="text-[11px] text-rose-400 mt-1">{errors.image}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" onClick={onClose} variant="ghost" size="sm">
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {speakerToEdit ? "Save Profile" : "Add Speaker"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
