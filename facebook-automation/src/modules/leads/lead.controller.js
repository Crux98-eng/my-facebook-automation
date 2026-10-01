const leadService = require('./lead.service');
const response = require('../../utils/response');
const { getPaginationParams, formatPaginatedResponse } = require('../../utils/pagination');

class LeadController {
  async list(req, res, next) {
    try {
      const { page, limit, offset } = getPaginationParams(req.query);
      const { status, intent, minScore } = req.query;
      const { items, total } = await leadService.listLeads({ status, intent, minScore, limit, offset });
      const paginated = formatPaginatedResponse(items, total, page, limit);
      return response.success(res, paginated);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const lead = await leadService.getLeadById(req.params.id);
      return response.success(res, lead);
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const updated = await leadService.updateLeadStatus(req.params.id, req.body.status);
      return response.success(res, updated, 'Lead status updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new LeadController();
