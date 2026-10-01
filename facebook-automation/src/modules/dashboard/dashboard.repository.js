const { query } = require('../../config/database');

class DashboardRepository {
  async getSummaryMetrics(minLeadScore = 60) {
    const postsTodaySql = `
      SELECT COUNT(*) FROM generated_posts
      WHERE status = 'published' AND published_at >= CURRENT_DATE
    `;

    const postsThisWeekSql = `
      SELECT COUNT(*) FROM generated_posts
      WHERE status = 'published' AND published_at >= NOW() - INTERVAL '7 days'
    `;

    const totalPostsSql = `
      SELECT COUNT(*) FROM generated_posts WHERE status = 'published'
    `;

    const totalLeadsSql = `
      SELECT COUNT(*) FROM leads
    `;

    const newLeadsSql = `
      SELECT COUNT(*) FROM leads WHERE status = 'new'
    `;

    const highIntentLeadsSql = `
      SELECT COUNT(*) FROM leads WHERE lead_score >= $1
    `;

    const assetsAvailableSql = `
      SELECT COUNT(*) FROM assets WHERE status = 'active' AND ai_analysis_status = 'completed'
    `;

    const assetsPendingAnalysisSql = `
      SELECT COUNT(*) FROM assets WHERE status = 'active' AND ai_analysis_status = 'pending'
    `;

    const engagementCountSql = `
      SELECT COUNT(*) FROM facebook_engagement
    `;

    const [
      postsTodayRes,
      postsThisWeekRes,
      totalPostsRes,
      totalLeadsRes,
      newLeadsRes,
      highIntentLeadsRes,
      assetsAvailableRes,
      assetsPendingAnalysisRes,
      engagementRes
    ] = await Promise.all([
      query(postsTodaySql),
      query(postsThisWeekSql),
      query(totalPostsSql),
      query(totalLeadsSql),
      query(newLeadsSql),
      query(highIntentLeadsSql, [minLeadScore]),
      query(assetsAvailableSql),
      query(assetsPendingAnalysisSql),
      query(engagementCountSql)
    ]);

    return {
      postsToday: parseInt(postsTodayRes.rows[0].count, 10),
      postsThisWeek: parseInt(postsThisWeekRes.rows[0].count, 10),
      totalPosts: parseInt(totalPostsRes.rows[0].count, 10),
      totalLeads: parseInt(totalLeadsRes.rows[0].count, 10),
      newLeads: parseInt(newLeadsRes.rows[0].count, 10),
      highIntentLeads: parseInt(highIntentLeadsRes.rows[0].count, 10),
      assetsAvailable: parseInt(assetsAvailableRes.rows[0].count, 10),
      assetsWaitingForAnalysis: parseInt(assetsPendingAnalysisRes.rows[0].count, 10),
      totalEngagementEvents: parseInt(engagementRes.rows[0].count, 10)
    };
  }
}

module.exports = new DashboardRepository();
