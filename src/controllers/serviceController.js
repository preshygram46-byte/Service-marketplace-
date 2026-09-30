const mongoose = require("mongoose");
const Service = require("../models/Service");

function response(res, status, success, message, data) {
  return res.status(status).json({ success, message, data });
}

exports.getServices = async (req, res, next) => {
  try {
    const services = await Service.find({ providerId: req.user.id })
      .select("_id name description price category")
      .sort({ createdAt: -1 });
    return response(res, 200, true, "Services fetched successfully", services);
  } catch (error) {
    return next(error);
  }
};

exports.createService = async (req, res, next) => {
  try {
    const { name, description, price, category } = req.body;
    if (!name || !description || price === undefined || !category) {
      return response(res, 400, false, "Name, description, price and category are required", null);
    }
    if (Number.isNaN(Number(price)) || Number(price) < 0) {
      return response(res, 400, false, "Price must be a non-negative number", null);
    }

    const service = await Service.create({
      providerId: req.user.id,
      name,
      description,
      price: Number(price),
      category,
    });
    return response(res, 201, true, "Service created successfully", {
      _id: service._id,
      name: service.name,
      description: service.description,
      price: service.price,
      category: service.category,
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateService = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return response(res, 400, false, "Invalid service id", null);
    }

    const updates = {};
    ["name", "description", "price", "category"].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (updates.price !== undefined) {
      updates.price = Number(updates.price);
      if (Number.isNaN(updates.price) || updates.price < 0) {
        return response(res, 400, false, "Price must be a non-negative number", null);
      }
    }

    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, providerId: req.user.id },
      updates,
      { new: true, runValidators: true }
    );
    if (!service) return response(res, 404, false, "Service not found", null);
    return response(res, 200, true, "Service updated successfully", {
      _id: service._id,
      name: service.name,
      description: service.description,
      price: service.price,
      category: service.category,
    });
  } catch (error) {
    return next(error);
  }
};