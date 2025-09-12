// // src/components/GoalForm.tsx
// import { useState } from "react";
// import { createGoal } from "@/api/goals";
// import type { Goal } from "@/api/goals";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// interface GoalFormProps {
//   onGoalCreated: () => void;
// }

// export function GoalForm({ onGoalCreated }: GoalFormProps) {
//   const [form, setForm] = useState<Goal>({
//     name: "",
//     description: "",
//     category: "",
//     colour: "#000000",
//     targetValue: 0,
//     currentValue: 0,
//   });

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     await createGoal(form);
//     setForm({
//       name: "",
//       description: "",
//       category: "",
//       colour: "#000000",
//       targetValue: 0,
//       currentValue: 0,
//     });
//     onGoalCreated();
//   };

//   return (
//     <Card className="w-full max-w-lg mx-auto mt-6">
//       <CardHeader>
//         <CardTitle>Create a Goal</CardTitle>
//       </CardHeader>
//       <CardContent>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           {/* Row 1 - Title */}
//           <div>
//             <Label htmlFor="name">Title</Label>
//             <Input name="name" value={form.name} onChange={handleChange} />
//           </div>

//           {/* Row 2 - Description */}
//           <div>
//             <Label htmlFor="description">Description</Label>
//             <Input
//               name="description"
//               value={form.description}
//               onChange={handleChange}
//             />
//           </div>

//           {/* Row 3 - Category */}
//           <div>
//             <Label htmlFor="category">Category</Label>
//             <Input
//               name="category"
//               value={form.category}
//               onChange={handleChange}
//             />
//           </div>

//           {/* Row 4 - Colour + Target */}
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <Label htmlFor="colour">Colour</Label>
//               <Input
//                 type="color"
//                 name="colour"
//                 value={form.colour}
//                 onChange={handleChange}
//               />
//             </div>
//             <div>
//               <Label htmlFor="targetValue">Target Amount</Label>
//               <Input
//                 type="number"
//                 name="targetValue"
//                 value={form.targetValue}
//                 onChange={handleChange}
//               />
//             </div>
//           </div>

//           <Button type="submit" className="w-full">
//             Add Goal
//           </Button>
//         </form>
//       </CardContent>
//     </Card>
//   );
// }

// src/components/GoalForm.tsx
import { useState } from "react";
import { createGoal } from "@/api/goals";
import type { Goal } from "@/api/goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  Sparkles,
  Tag,
  FileText,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

interface GoalFormProps {
  onGoalCreated: () => void;
}

const GOAL_CATEGORIES = [
  { value: "electronics", label: "📱 Electronics", color: "#3b82f6" },
  { value: "travel", label: "✈️ Travel", color: "#10b981" },
  { value: "fashion", label: "👕 Fashion", color: "#f59e0b" },
  { value: "home", label: "🏠 Home & Garden", color: "#8b5cf6" },
  { value: "health", label: "🏥 Health & Fitness", color: "#ef4444" },
  { value: "education", label: "📚 Education", color: "#06b6d4" },
  { value: "vehicle", label: "🚗 Vehicle", color: "#84cc16" },
  { value: "investment", label: "📈 Investment", color: "#f97316" },
  { value: "other", label: "🎯 Other", color: "#6b7280" },
];

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];

export function GoalForm({ onGoalCreated }: GoalFormProps) {
  const [form, setForm] = useState<Goal>({
    name: "",
    description: "",
    category: "",
    colour: "#3b82f6",
    targetValue: 0,
    currentValue: 0,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Goal name is required";
    } else if (form.name.length < 3) {
      newErrors.name = "Goal name must be at least 3 characters";
    }

    if (!form.description.trim()) {
      newErrors.description = "Description is required";
    } else if (form.description.length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!form.category) {
      newErrors.category = "Please select a category";
    }

    if (!form.targetValue || form.targetValue <= 0) {
      newErrors.targetValue = "Target amount must be greater than 0";
    } else if (form.targetValue < 100) {
      newErrors.targetValue = "Target amount must be at least ₹100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === "number" ? parseFloat(value) || 0 : value;

    setForm({ ...form, [name]: newValue });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleCategoryChange = (value: string) => {
    setForm({ ...form, category: value });
    if (errors.category) {
      setErrors({ ...errors, category: "" });
    }

    // Auto-set color based on category
    const categoryData = GOAL_CATEGORIES.find((cat) => cat.value === value);
    if (categoryData) {
      setForm((prev) => ({ ...prev, colour: categoryData.color }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setLoading(true);
    try {
      await createGoal(form);
      setForm({
        name: "",
        description: "",
        category: "",
        colour: "#3b82f6",
        targetValue: 0,
        currentValue: 0,
      });
      setErrors({});
      onGoalCreated();
      toast.success("🎉 Goal created successfully!");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Failed to create goal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = GOAL_CATEGORIES.find(
    (cat) => cat.value === form.category
  );

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl bg-gradient-to-br from-white via-gray-50/50 to-white border-0 overflow-hidden">
      {/* Header with gradient */}
      <div
        className="h-2 w-full"
        style={{
          background: `linear-gradient(90deg, ${form.colour}40, ${form.colour}, ${form.colour}40)`,
        }}
      />

      <CardHeader className="pb-6 bg-gradient-to-r from-gray-50/50 to-white">
        <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div
            className="p-2 rounded-xl shadow-sm"
            style={{ backgroundColor: `${form.colour}20` }}
          >
            <Target className="w-6 h-6" style={{ color: form.colour }} />
          </div>
          Create New Goal
          <Sparkles className="w-5 h-5 text-yellow-500" />
        </CardTitle>
        <p className="text-gray-600 mt-2">
          Set up your financial milestone and start tracking your progress
        </p>
      </CardHeader>

      <CardContent className="p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Goal Name */}
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-base font-semibold flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Goal Name
            </Label>
            <Input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., New iPhone 15 Pro, Dream Vacation to Japan"
              className={`h-12 text-base ${
                errors.name ? "border-red-500 focus-visible:ring-red-500" : ""
              }`}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-base font-semibold flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe why this goal is important to you and what achieving it will mean... or just include a product link!"
              className={`min-h-[100px] text-base resize-none ${
                errors.description
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Category
            </Label>
            <Select value={form.category} onValueChange={handleCategoryChange}>
              <SelectTrigger
                className={`h-12 text-base ${
                  errors.category ? "border-red-500" : ""
                }`}
              >
                <SelectValue placeholder="Choose a category for your goal" />
              </SelectTrigger>
              <SelectContent>
                {GOAL_CATEGORIES.map((category) => (
                  <SelectItem
                    key={category.value}
                    value={category.value}
                    className="text-base py-3"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          {/* Color and Target Amount Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Theme Color
              </Label>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, colour: color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                        form.colour === color
                          ? "border-gray-800 ring-2 ring-gray-300"
                          : "border-white"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  name="colour"
                  value={form.colour}
                  onChange={handleChange}
                  className="h-12 w-full cursor-pointer"
                />
              </div>
            </div>

            {/* Target Amount */}
            <div className="space-y-2">
              <Label
                htmlFor="targetValue"
                className="text-base font-semibold flex items-center gap-2"
              >
                <IndianRupee className="w-4 h-4" />
                Target Amount
              </Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="targetValue"
                  type="number"
                  name="targetValue"
                  value={form.targetValue || ""}
                  onChange={handleChange}
                  placeholder="50000"
                  min="1"
                  className={`h-12 pl-10 text-base ${
                    errors.targetValue
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }`}
                />
              </div>
              {errors.targetValue && (
                <p className="text-sm text-red-600">{errors.targetValue}</p>
              )}
              {form.targetValue > 0 && (
                <p className="text-sm text-gray-500">
                  Target:{" "}
                  {new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                  }).format(form.targetValue)}
                </p>
              )}
            </div>
          </div>

          {/* Preview Card */}
          {form.name && form.targetValue > 0 && (
            <div className="mt-8 p-6 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Preview
              </h4>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: `${form.colour}20` }}
                >
                  {selectedCategory ? (
                    <span className="text-lg">
                      {selectedCategory.label.split(" ")[0]}
                    </span>
                  ) : (
                    <Target
                      className="w-6 h-6"
                      style={{ color: form.colour }}
                    />
                  )}
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900">{form.name}</h5>
                  <p className="text-sm text-gray-600">
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

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
            disabled={loading}
            style={{
              background: loading
                ? undefined
                : `linear-gradient(135deg, ${form.colour}, ${form.colour}dd)`,
            }}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Creating Goal...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Create Goal
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
