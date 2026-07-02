// ========== FILE: src/modules/routes/routes.controller.js ==========
const { successResponse, errorResponse, paginatedResponse } = require('../../utils/response');
const logger = require('../../utils/logger');
const routesService = require('./routes.service');

// ───────────── Error Code → HTTP Response Map ─────────────
const ERROR_MAP = {
  ROUTE_EXISTS: { status: 409, message: 'Route with this name already exists in this city' },
  ROUTE_NOT_FOUND: { status: 404, message: 'Route not found' },
  ROUTE_HAS_ACTIVE_SUBSCRIPTIONS: { status: 400, message: 'Cannot deactivate route with active subscriptions' },
};

const handleServiceError = (res, error) => {
  const mapped = ERROR_MAP[error.message];
  if (mapped) {
    return errorResponse(res, mapped.message, mapped.status);
  }
  logger.error(error.message, { stack: error.stack });
  return errorResponse(res, 'Something went wrong', 500);
};

// ───────────── Create Route (Admin) ─────────────
const createRoute = async (req, res) => {
  try {
    const route = await routesService.createRoute(req.body);
    return successResponse(res, route, 'Route created successfully', 201);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get All Routes ─────────────
const getAllRoutes = async (req, res) => {
  try {
    const { city, pickup_query, drop_query, page, limit, is_active } = req.query;
    
    // Only admins can request inactive routes. Public requests default to active only.
    let activeFilter = is_active;
    if (req.user && req.user.role === 'admin' && is_active !== undefined) {
       activeFilter = is_active;
    } else {
       activeFilter = true;
    }

    const data = await routesService.getAllRoutes({
      city,
      pickup_query,
      drop_query,
      page,
      limit,
      is_active: activeFilter,
    });

    return paginatedResponse(res, data.routes, data.total, data.page, data.limit);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Route By ID ─────────────
const getRouteById = async (req, res) => {
  try {
    const data = await routesService.getRouteById(req.params.id);
    return successResponse(res, data, 'Route details fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Update Route (Admin) ─────────────
const updateRoute = async (req, res) => {
  try {
    const route = await routesService.updateRoute(req.params.id, req.body);
    return successResponse(res, route, 'Route updated successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Delete Route (Admin) ─────────────
const deleteRoute = async (req, res) => {
  try {
    const result = await routesService.deleteRoute(req.params.id);
    return successResponse(res, null, result.message);
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Cities ─────────────
const getCities = async (req, res) => {
  try {
    const cities = await routesService.getCitiesWithRoutes();
    return successResponse(res, cities, 'Cities fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

// ───────────── Get Routes By City ─────────────
const getRoutesByCity = async (req, res) => {
  try {
    const routes = await routesService.getRoutesByCity(req.params.city);
    return successResponse(res, routes, 'Routes fetched successfully');
  } catch (error) {
    return handleServiceError(res, error);
  }
};

module.exports = {
  createRoute,
  getAllRoutes,
  getRouteById,
  updateRoute,
  deleteRoute,
  getCities,
  getRoutesByCity,
};
// ========== END ==========
