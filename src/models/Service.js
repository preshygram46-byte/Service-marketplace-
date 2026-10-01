const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Service || mongoose.model("Service", serviceSchema);
