const mongoose = require("mongoose");
const Service = require("../models/Service");
const Category = require("../models/Category");
const { ok, fail } = require("../utils/respond");

const isId = (id) => mongoose.isValidObjectId(id);


const escapeRegex = (text) =>
  typeof text === "string" ? text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&") : "";

const parsePrice = (value) => {
  if (
    value === null ||
    value === "" ||
    typeof value === "boolean" ||
    (typeof value !== "number" && typeof value !== "string")
  ) {
    return null;
  }
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
};


// GET /api/services
exports.getServices = async (req, res) => {
  try {
    const filter = {};
    const { q, category, provider, page, limit } = req.query;

    const usePagination = page !== undefined || limit !== undefined;
    const pageNumber = page === undefined ? 1 : Number(page);
    const limitNumber = limit === undefined ? 20 : Number(limit);

    if (
      usePagination &&
      (!Number.isInteger(pageNumber) ||
        pageNumber < 1 ||
        !Number.isInteger(limitNumber) ||
        limitNumber < 1 ||
        limitNumber > 100)
    ) {
      return fail(
        res,
        400,
        "page must be at least 1 and limit must be between 1 and 100"
      );
    }

    if (q) {
      const escapedQ = escapeRegex(q);
      filter.$or = [
        { title: { $regex: escapedQ, $options: "i" } },
        { description: { $regex: escapedQ, $options: "i" } },
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

    if (provider) {
      if (!isId(provider)) {
        return fail(res, 400, "Invalid provider id");
      }
      filter.providerId = provider;
    }

    const query = Service.find(filter)
      .populate("categoryId", "name slug")
      .populate("providerId", "name")
      .sort({ createdAt: -1 });

    if (usePagination) {
      query.skip((pageNumber - 1) * limitNumber).limit(limitNumber);
    }

    const [services, total] = await Promise.all([
      query,
      Service.countDocuments(filter),
    ]);

    if (usePagination) {
      res.set({
        "X-Total-Count": String(total),
        "X-Page": String(pageNumber),
        "X-Limit": String(limitNumber),
      });
    }

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
      .populate("providerId", "name");

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

    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const normalizedDescription =
      typeof description === "string" ? description.trim() : "";
    const normalizedPrice = parsePrice(price);

    if (!normalizedTitle || !normalizedDescription) {
      return fail(res, 400, "title and description cannot be empty");
    }

    if (normalizedPrice === null) {
      return fail(res, 400, "price must be a non-negative number");
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return fail(res, 404, "Category not found");
    }

    const service = await Service.create({
      title: normalizedTitle,
      description: normalizedDescription,
      price: normalizedPrice,
      categoryId,
      providerId: req.user.id,
    });

    const populated = await Service.findById(service._id)
      .populate("categoryId", "name slug")
      .populate("providerId", "name");

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

    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string" || !req.body.title.trim()) {
        return fail(res, 400, "title cannot be empty");
      }
      service.title = req.body.title.trim();
    }

    if (req.body.description !== undefined) {
      if (
        typeof req.body.description !== "string" ||
        !req.body.description.trim()
      ) {
        return fail(res, 400, "description cannot be empty");
      }
      service.description = req.body.description.trim();
    }

    if (req.body.price !== undefined) {
      const normalizedPrice = parsePrice(req.body.price);
      if (normalizedPrice === null) {
        return fail(res, 400, "price must be a non-negative number");
      }
      service.price = normalizedPrice;
    }

    if (req.body.categoryId !== undefined) {
      if (!isId(req.body.categoryId)) {
        return fail(res, 400, "Invalid categoryId");
      }

      const category = await Category.findById(req.body.categoryId);
      if (!category) {
        return fail(res, 404, "Category not found");
      }
      service.categoryId = req.body.categoryId;
    }

    await service.save();

    const populated = await Service.findById(service._id)
      .populate("categoryId", "name slug")
      .populate("providerId", "name");

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
