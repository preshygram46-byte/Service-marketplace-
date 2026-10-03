const mongoose = require("mongoose");
const Category = require("../models/Category");
const Service = require("../models/Service");
const { ok, fail } = require("../utils/respond");

const isId = (id) => mongoose.isValidObjectId(id);

const makeSlug = (name) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });

    return ok(
      res,
      200,
      "Categories retrieved successfully",
      categories
    );
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// GET /api/categories/:id
exports.getCategoryById = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return fail(res, 400, "Invalid category id");
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return fail(res, 404, "Category not found");
    }

    return ok(res, 200, "Category retrieved successfully", category);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// POST /api/categories
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return fail(res, 400, "Category name is required");
    }

    const category = await Category.create({
      name: name.trim(),
      slug: makeSlug(name),
    });

    return ok(res, 201, "Category created successfully", category);
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, "Category already exists");
    }

    return fail(res, 500, "Something went wrong");
  }
};

// PATCH /api/categories/:id
exports.updateCategory = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return fail(res, 400, "Invalid category id");
    }

    const { name } = req.body;

    if (!name || !name.trim()) {
      return fail(res, 400, "Category name is required");
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        slug: makeSlug(name),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!category) {
      return fail(res, 404, "Category not found");
    }

    return ok(res, 200, "Category updated successfully", category);
  } catch (error) {
    if (error.code === 11000) {
      return fail(res, 409, "Category already exists");
    }

    return fail(res, 500, "Something went wrong");
  }
};

// DELETE /api/categories/:id
exports.deleteCategory = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return fail(res, 400, "Invalid category id");
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return fail(res, 404, "Category not found");
    }

    const serviceExists = await Service.exists({
      categoryId: category._id,
    });

    if (serviceExists) {
      return fail(
        res,
        400,
        "Cannot delete a category that contains services"
      );
    }

    await category.deleteOne();

    return ok(res, 200, "Category deleted successfully", null);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};