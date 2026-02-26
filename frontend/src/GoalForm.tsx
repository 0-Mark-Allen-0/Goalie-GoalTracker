import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGoal, updateGoal } from "@/api/goals";
import type { Goal } from "@/api/goals";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Target,
  Palette,
  IndianRupee,
  Plus,
  Tag,
  FileText,
  CheckCircle,
  X,
  Save,
} from "lucide-react";
import { toast } from "sonner";

interface GoalFormProps {
  onGoalCreated: () => void; // Used for both creation and updates
  onCancel?: () => void;
  initialData?: Goal; // <-- NEW: Allows form to be used for editing
}

const GOAL_CATEGORIES = [
  { value: "electronics", label: "📱 Electronics" },
  { value: "travel", label: "✈️ Travel" },
  { value: "fashion", label: "👕 Fashion" },
  { value: "home", label: "🏠 Home & Garden" },
  { value: "health", label: "🏥 Health & Fitness" },
  { value: "education", label: "📚 Education" },
  { value: "vehicle", label: "🚗 Vehicle" },
  { value: "investment", label: "📈 Investment" },
  { value: "other", label: "🎯 Other" },
];

const PRESET_COLORS = [
  "#FFB3BA",
  "#FFDFBA",
  "#FFFFBA",
  "#BAFFC9",
  "#BAE1FF",
  "#D0CAFA",
  "#F3E7E9",
  "#A2E1DB",
  "#E2F0CB",
  "#CBAACB",
  "#FFC3A0",
  "#FFF3B0",
  "#FAD0C4",
  "#D4F0F0",
  "#C1E1C1",
];

export function GoalForm({
  onGoalCreated,
  onCancel,
  initialData,
}: GoalFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  // Initialize state with existing data if editing, otherwise default
  const [form, setForm] = useState<Goal>(
    initialData || {
      name: "",
      description: "",
      category: "",
      colour: "#BAE1FF",
      targetValue: 0,
      currentValue: 0,
    },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Goal name is required";
    else if (form.name.length < 3)
      newErrors.name = "Goal name must be at least 3 characters";
    if (!form.description.trim())
      newErrors.description = "Description is required";
    else if (form.description.length < 10)
      newErrors.description = "Description must be at least 10 characters";
    if (!form.category) newErrors.category = "Please select a category";
    if (!form.targetValue || form.targetValue <= 0)
      newErrors.targetValue = "Target amount must be greater than 0";
    else if (form.targetValue < 100)
      newErrors.targetValue = "Target amount must be at least ₹100";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === "number" ? parseFloat(value) || 0 : value;
    setForm({ ...form, [name]: newValue });
    if (errors[name]) setErrors({ ...errors, [name]: "" });
  };

  const handleCategoryChange = (value: string) => {
    setForm({ ...form, category: value });
    if (errors.category) setErrors({ ...errors, category: "" });
  };

  // Creation Mutation
  const createMutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      onGoalCreated();
      toast.success("🎉 Goal created successfully!");
    },
    onError: () => toast.error("Failed to create goal. Please try again."),
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (updatedGoal: Goal) =>
      updateGoal(initialData!.id!, updatedGoal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      onGoalCreated();
      toast.success("✨ Goal updated successfully!");
    },
    onError: () => toast.error("Failed to update goal. Please try again."),
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }
    if (isEditing) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const selectedCategory = GOAL_CATEGORIES.find(
    (cat) => cat.value === form.category,
  );

  return (
    <div className="w-full max-w-2xl mx-auto rounded-[32px] overflow-hidden flex flex-col bg-[#F1F0E8] shadow-2xl relative">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-5 right-5 w-9 h-9 z-50 flex items-center justify-center rounded-full bg-white/40 backdrop-blur-md border border-white/60 shadow-sm text-[#546e7a] hover:bg-white/70 hover:text-[#2c3e50] transition-all duration-200 hover:scale-105 active:scale-95"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <style>
        {`
          .dynamic-scroll::-webkit-scrollbar { width: 8px; }
          .dynamic-scroll::-webkit-scrollbar-track { background: transparent; }
          .dynamic-scroll::-webkit-scrollbar-thumb { background-color: ${form.colour}80; border-radius: 9999px; transition: background-color 0.3s ease; }
          .dynamic-scroll::-webkit-scrollbar-thumb:hover { background-color: ${form.colour}; }
        `}
      </style>

      <div
        className="h-2 w-full shrink-0 transition-colors duration-300"
        style={{ backgroundColor: form.colour }}
      />

      <div className="dynamic-scroll p-8 space-y-8 overflow-y-auto max-h-[85vh] pr-6">
        <div className="pb-2">
          <h2 className="text-3xl font-extrabold text-[#2c3e50] flex items-center gap-3 pr-12">
            <div className="p-3 rounded-2xl shadow-sm border border-white/60 bg-white/50 transition-colors duration-300">
              <Target className="w-7 h-7" style={{ color: form.colour }} />
            </div>
            {isEditing ? "Edit Goal" : "Create New Goal"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-sm font-bold text-[#546e7a] uppercase tracking-wider flex items-center gap-2 mb-2"
            >
              <FileText className="w-4 h-4" /> Goal Name
            </Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., Dream Vacation to Japan"
              className={`h-14 rounded-2xl text-base bg-white border-white/60 shadow-sm px-4 transition-all focus-visible:ring-[#89A8B2] ${errors.name ? "border-[#BF4646] focus-visible:ring-[#BF4646]" : ""}`}
            />
            {errors.name && (
              <p className="text-sm text-[#BF4646] font-medium">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-sm font-bold text-[#546e7a] uppercase tracking-wider flex items-center gap-2 mb-2"
            >
              <FileText className="w-4 h-4" /> Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe why this goal is important to you..."
              className={`min-h-[120px] rounded-2xl text-base resize-none bg-white border-white/60 shadow-sm p-4 transition-all focus-visible:ring-[#89A8B2] ${errors.description ? "border-[#BF4646] focus-visible:ring-[#BF4646]" : ""}`}
            />
            {errors.description && (
              <p className="text-sm text-[#BF4646] font-medium">
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-[#546e7a] uppercase tracking-wider flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4" /> Category
              </Label>
              <Select
                value={form.category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger
                  className={`h-14 rounded-2xl text-base bg-white border-white/60 shadow-sm px-4 transition-all focus-visible:ring-[#89A8B2] ${errors.category ? "border-[#BF4646]" : ""}`}
                >
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-white/60 bg-white shadow-xl">
                  {GOAL_CATEGORIES.map((category) => (
                    <SelectItem
                      key={category.value}
                      value={category.value}
                      className="text-base py-3 cursor-pointer hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-[#BF4646] font-medium">
                  {errors.category}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="targetValue"
                className="text-sm font-bold text-[#546e7a] uppercase tracking-wider flex items-center gap-2 mb-2"
              >
                <IndianRupee className="w-4 h-4" /> Target Amount
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#89A8B2]" />
                <Input
                  id="targetValue"
                  type="number"
                  name="targetValue"
                  value={form.targetValue || ""}
                  onChange={handleChange}
                  placeholder="50000"
                  min="1"
                  className={`h-14 pl-12 rounded-2xl text-base bg-white border-white/60 shadow-sm transition-all focus-visible:ring-[#89A8B2] ${errors.targetValue ? "border-[#BF4646] focus-visible:ring-[#BF4646]" : ""}`}
                />
              </div>
              {errors.targetValue && (
                <p className="text-sm text-[#BF4646] font-medium">
                  {errors.targetValue}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label className="text-sm font-bold text-[#546e7a] uppercase tracking-wider flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4" /> Theme Color
            </Label>
            <div className="flex gap-3 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, colour: color })}
                  className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-90 ${form.colour === color ? "border-[#2c3e50] scale-110 shadow-md" : "border-white shadow-sm"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div
                className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-transform overflow-hidden ${!PRESET_COLORS.includes(form.colour) ? "border-[#2c3e50] scale-110 shadow-md" : "border-white shadow-sm hover:scale-110"}`}
              >
                <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]" />
                <Input
                  type="color"
                  name="colour"
                  value={form.colour}
                  onChange={handleChange}
                  className="absolute inset-[-10px] w-20 h-20 opacity-0 cursor-pointer"
                  title="Custom Color"
                />
              </div>
            </div>
          </div>

          {form.name && form.targetValue > 0 && (
            <div className="mt-8 p-6 rounded-3xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-md transition-all duration-300">
              <h4 className="text-xs font-bold text-[#546e7a] uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Preview
              </h4>
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-white transition-colors duration-300"
                  style={{ backgroundColor: `${form.colour}30` }}
                >
                  {selectedCategory ? (
                    <span className="text-2xl">
                      {selectedCategory.label.split(" ")[0]}
                    </span>
                  ) : (
                    <Target
                      className="w-7 h-7 transition-colors duration-300"
                      style={{ color: form.colour }}
                    />
                  )}
                </div>
                <div>
                  <h5 className="font-extrabold text-lg text-[#2c3e50]">
                    {form.name}
                  </h5>
                  <p className="text-[#546e7a] font-medium mt-1">
                    Target:{" "}
                    {new Intl.NumberFormat("en-IN", {
                      style: "currency",
                      currency: "INR",
                    }).format(form.targetValue)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-16 mt-4 flex items-center justify-center gap-2 rounded-full font-bold text-lg text-[#2c3e50] transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] border border-white/40"
            style={{
              backgroundColor: form.colour,
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2c3e50] border-t-transparent" />
                {isEditing ? "Saving Changes..." : "Creating Goal..."}
              </>
            ) : (
              <>
                {isEditing ? (
                  <Save className="w-6 h-6" />
                ) : (
                  <Plus className="w-6 h-6" />
                )}
                {isEditing ? "Save Changes" : "Create Goal"}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
