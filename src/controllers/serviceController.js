const mongoose = require("mongoose");
const Service = require("../models/Service");
const Category = require("../models/Category");
const { ok, fail } = require("../utils/respond");

const isId = (id) => mongoose.isValidObjectId(id);

// GET /api/services
exports.getServices = async (req, res) => {
  try {
    const filter = {};
    const { q, category, provider } = req.query;

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    if (category) {
      if (isId(category)) {
        filter.categoryId = category;
      } else {
        const foundCategory = await Category.findOne({
          slug: category.toLowerCase(),
        });

        if (!foundCategory) {
          return ok(res, 200, "Services retrieved successfully", []);
        }

        filter.categoryId = foundCategory._id;
      }
    }

    if (provider && isId(provider)) {
      filter.providerId = provider;
    }

    const services = await Service.find(filter)
      .populate("categoryId", "name slug")
      .populate("providerId", "name email")
      .sort({ createdAt: -1 });

    return ok(res, 200, "Services retrieved successfully", services);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// GET /api/services/:id
exports.getServiceById = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return fail(res, 400, "Invalid service id");
    }

    const service = await Service.findById(req.params.id)
      .populate("categoryId", "name slug")
      .populate("providerId", "name email");

    if (!service) {
      return fail(res, 404, "Service not found");
    }

    return ok(res, 200, "Service retrieved successfully", service);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// POST /api/services
exports.createService = async (req, res) => {
  try {
    const { title, description, price, categoryId } = req.body;

    if (!title || !description || price === undefined || !categoryId) {
      return fail(
        res,
        400,
        "title, description, price and categoryId are required"
      );
    }

    if (!isId(categoryId)) {
      return fail(res, 400, "Invalid categoryId");
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return fail(res, 404, "Category not found");
    }

    const service = await Service.create({
      title,
      description,
      price,
      categoryId,
      providerId: req.user.id,
    });

    const populated = await Service.findById(service._id)
      .populate("categoryId", "name slug")
      .populate("providerId", "name email");

    return ok(res, 201, "Service created successfully", populated);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// PATCH /api/services/:id
exports.updateService = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return fail(res, 400, "Invalid service id");
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return fail(res, 404, "Service not found");
    }

    const isOwner = String(service.providerId) === String(req.user.id);
    if (req.user.role !== "admin" && !isOwner) {
      return fail(res, 403, "Insufficient permission");
    }

    const allowedFields = ["title", "description", "price", "categoryId"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        service[field] = req.body[field];
      }
    });

    if (service.categoryId && !isId(service.categoryId)) {
      return fail(res, 400, "Invalid categoryId");
    }

    await service.save();

    const populated = await Service.findById(service._id)
      .populate("categoryId", "name slug")
      .populate("providerId", "name email");

    return ok(res, 200, "Service updated successfully", populated);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};

// DELETE /api/services/:id
exports.deleteService = async (req, res) => {
  try {
    if (!isId(req.params.id)) {
      return fail(res, 400, "Invalid service id");
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return fail(res, 404, "Service not found");
    }

    const isOwner = String(service.providerId) === String(req.user.id);
    if (req.user.role !== "admin" && !isOwner) {
      return fail(res, 403, "Insufficient permission");
    }

    await service.deleteOne();

    return ok(res, 200, "Service deleted successfully", null);
  } catch (error) {
    return fail(res, 500, "Something went wrong");
  }
};