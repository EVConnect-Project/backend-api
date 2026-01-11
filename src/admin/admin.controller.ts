import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Ip,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminChatService } from './admin-chat.service';
import { AdminAuditService } from './admin-audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly adminChatService: AdminChatService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  // Dashboard Stats
  @Get('stats')
  async getDashboardStats() {
    try {
      return await this.adminService.getDashboardStats();
    } catch (error) {
      console.error('Controller error in getDashboardStats:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  // Analytics
  @Get('analytics')
  async getAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getAnalytics(startDate, endDate);
  }

  @Get('analytics/revenue')
  async getRevenueData(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getRevenueData(startDate, endDate);
  }

  @Get('analytics/user-growth')
  async getUserGrowth(@Query('period') period: string) {
    return this.adminService.getUserGrowthData(period);
  }

  @Get('analytics/bookings')
  async getBookingStats() {
    return this.adminService.getBookingStats();
  }

  // User Management
  @Get('users')
  async getUsers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('role') role: string,
  ) {
    return this.adminService.getUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      role,
    });
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Get('users/:id/payment-accounts')
  async getUserPaymentAccounts(@Param('id') id: string) {
    return this.adminService.getUserPaymentAccounts(id);
  }

  @Post('users/:id/ban')
  async banUser(@Param('id') id: string) {
    const user = await this.adminService.banUser(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return user;
  }

  @Post('users/:id/unban')
  async unbanUser(@Param('id') id: string) {
    const user = await this.adminService.unbanUser(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return user;
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    const user = await this.adminService.updateUserRole(id, role);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return user;
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    await this.adminService.deleteUser(id);
    
    return { 
      message: 'User permanently deleted',
      deletedUserId: id 
    };
  }

  // Charger Management
  @Get('chargers')
  async getChargers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('status') status: string,
    @Query('verified') verified: string,
    @Query('banned') banned: string,
  ) {
    return this.adminService.getChargers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      status,
      verified: verified ? verified === 'true' : undefined,
      banned: banned ? banned === 'true' : undefined,
    });
  }

  @Get('chargers/:id')
  async getChargerById(@Param('id') id: string) {
    return this.adminService.getChargerById(id);
  }

  @Get('chargers/:id/analytics')
  async getChargerAnalytics(@Param('id') id: string) {
    return this.adminService.getChargerAnalytics(id);
  }

  @Post('chargers/:id/approve')
  async approveCharger(@Param('id') id: string) {
    const charger = await this.adminService.approveCharger(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return charger;
  }

  @Post('chargers/:id/reject')
  async rejectCharger(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const charger = await this.adminService.rejectCharger(id, reason);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return charger;
  }

  @Patch('chargers/:id')
  async updateCharger(@Param('id') id: string, @Body() data: any) {
    const charger = await this.adminService.updateCharger(id, data);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return charger;
  }

  @Delete('chargers/:id')
  async deleteCharger(@Param('id') id: string) {
    const charger = await this.adminService.deleteCharger(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return charger;
  }

  @Post('chargers/:id/ban')
  async banCharger(@Param('id') id: string) {
    return this.adminService.banCharger(id);
  }

  @Post('chargers/:id/unban')
  async unbanCharger(@Param('id') id: string) {
    return this.adminService.unbanCharger(id);
  }

  // Booking Management
  @Get('bookings')
  async getBookings(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.adminService.getBookings({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
      startDate,
      endDate,
    });
  }

  @Get('bookings/:id')
  async getBookingById(@Param('id') id: string) {
    return this.adminService.getBookingById(id);
  }

  @Get('bookings/:id/timeline')
  async getBookingTimeline(@Param('id') id: string) {
    return this.adminService.getBookingTimeline(id);
  }

  @Post('bookings/:id/approve')
  async approveBooking(@Param('id') id: string) {
    const booking = await this.adminService.approveBooking(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return booking;
  }

  @Post('bookings/:id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const booking = await this.adminService.cancelBooking(id, reason);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return booking;
  }

  // Mechanic Application Management
  @Get('mechanic-applications')
  async getMechanicApplications(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
    @Query('search') search: string,
  ) {
    return this.adminService.getMechanicApplications({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      status,
      search,
    });
  }

  @Get('mechanic-applications/:id')
  async getMechanicApplicationById(@Param('id') id: string) {
    return this.adminService.getMechanicApplicationById(id);
  }

  @Post('mechanic-applications/:id/approve')
  async approveMechanicApplication(
    @Param('id') id: string,
    @Body('reviewNotes') reviewNotes: string,
    @Request() req,
  ) {
    const application = await this.adminService.approveMechanicApplication(
      id,
      reviewNotes,
      req.user.userId,
    );
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return application;
  }

  @Post('mechanic-applications/:id/reject')
  async rejectMechanicApplication(
    @Param('id') id: string,
    @Body('reviewNotes') reviewNotes: string,
    @Request() req,
  ) {
    const application = await this.adminService.rejectMechanicApplication(
      id,
      reviewNotes,
      req.user.userId,
    );
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return application;
  }

  // Mechanics Management
  @Get('mechanics')
  async getMechanics(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search: string,
    @Query('available') available: string,
  ) {
    return this.adminService.getMechanics({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      search,
      available: available ? available === 'true' : undefined,
    });
  }

  @Get('mechanics/:id')
  async getMechanicById(@Param('id') id: string) {
    return this.adminService.getMechanicById(id);
  }

  @Patch('mechanics/:id')
  async updateMechanic(@Param('id') id: string, @Body() data: any) {
    const mechanic = await this.adminService.updateMechanic(id, data);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return mechanic;
  }

  @Delete('mechanics/:id')
  async deleteMechanic(@Param('id') id: string) {
    const mechanic = await this.adminService.deleteMechanic(id);
    
    // WebSocket broadcasting removed - implement REST-based notifications if needed
    
    return mechanic;
  }

  @Post('mechanics/:id/ban')
  async banMechanic(@Param('id') id: string) {
    return this.adminService.banMechanic(id);
  }

  @Post('mechanics/:id/unban')
  async unbanMechanic(@Param('id') id: string) {
    return this.adminService.unbanMechanic(id);
  }

  // ==================== ADMIN CHAT ENDPOINTS ====================

  /**
   * Initiate a chat with any user (owner/seller/mechanic/driver)
   */
  @Post('chat/initiate')
  async initiateChat(
    @Request() req,
    @Body('targetUserId') targetUserId: string,
    @Body('initialMessage') initialMessage?: string,
    @Ip() ip?: string,
  ) {
    const result = await this.adminChatService.initiateAdminChat(
      req.user.userId,
      targetUserId,
      initialMessage,
    );

    await this.adminAuditService.logAction(
      req.user.userId,
      'initiate_chat',
      'user',
      targetUserId,
      { hasInitialMessage: !!initialMessage },
      undefined,
      ip,
    );

    return result;
  }

  /**
   * Get all admin conversations
   */
  @Get('chat/conversations')
  async getConversations(
    @Request() req,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.adminChatService.getAdminConversations(
      req.user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  /**
   * Get messages for a conversation
   */
  @Get('chat/conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.adminChatService.getConversationMessages(
      conversationId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * Send a message in admin chat
   */
  @Post('chat/conversations/:id/send')
  async sendMessage(
    @Request() req,
    @Param('id') conversationId: string,
    @Body('content') content: string,
    @Body('type') type?: string,
    @Body('priority') priority?: 'normal' | 'high' | 'urgent',
  ) {
    return this.adminChatService.sendAdminMessage(
      conversationId,
      req.user.userId,
      content,
      type as any,
      priority,
    );
  }

  /**
   * Broadcast message to multiple users
   */
  @Post('chat/broadcast')
  async broadcastMessage(
    @Request() req,
    @Body('userIds') userIds: string[],
    @Body('message') message: string,
    @Body('priority') priority?: 'normal' | 'high' | 'urgent',
    @Ip() ip?: string,
  ) {
    const messages = await this.adminChatService.broadcastMessage(
      req.user.userId,
      userIds,
      message,
      priority,
    );

    await this.adminAuditService.logAction(
      req.user.userId,
      'broadcast_message',
      'multiple_users',
      'broadcast',
      { recipientCount: userIds.length, priority },
      undefined,
      ip,
    );

    return {
      sent: messages.length,
      messages,
    };
  }

  /**
   * Set conversation priority
   */
  @Put('chat/conversations/:id/priority')
  async setPriority(
    @Param('id') conversationId: string,
    @Body('priority') priority: 'normal' | 'high' | 'urgent',
  ) {
    await this.adminChatService.setPriority(conversationId, priority);
    return { success: true };
  }

  /**
   * Get user context for chat
   */
  @Get('chat/users/:id/context')
  async getUserContext(@Param('id') userId: string) {
    return this.adminChatService.getUserContext(userId);
  }

  // ==================== ENHANCED CHARGER CONTROL ====================

  /**
   * Suspend/Resume charger (admin override)
   */
  @Put('chargers/:id/suspend')
  async suspendCharger(
    @Request() req,
    @Param('id') id: string,
    @Body('suspend') suspend: boolean,
    @Body('reason') reason?: string,
    @Ip() ip?: string,
  ) {
    const charger = await this.adminService.suspendCharger(id, suspend, reason);

    await this.adminAuditService.logAction(
      req.user.userId,
      suspend ? 'suspend_charger' : 'resume_charger',
      'charger',
      id,
      { reason },
      reason,
      ip,
    );

    return charger;
  }

  /**
   * Override charger status
   */
  @Put('chargers/:id/status')
  async setChargerStatus(
    @Request() req,
    @Param('id') id: string,
    @Body('status') status: 'available' | 'in-use' | 'offline',
    @Body('reason') reason?: string,
    @Ip() ip?: string,
  ) {
    const charger = await this.adminService.setChargerStatus(id, status, reason);

    await this.adminAuditService.logAction(
      req.user.userId,
      'change_charger_status',
      'charger',
      id,
      { newStatus: status, reason },
      reason,
      ip,
    );

    return charger;
  }

  /**
   * Set price override for a charger
   */
  @Put('chargers/:id/price-override')
  async setPriceOverride(
    @Request() req,
    @Param('id') id: string,
    @Body('pricePerKwh') pricePerKwh: number,
    @Body('reason') reason?: string,
    @Ip() ip?: string,
  ) {
    const charger = await this.adminService.setChargerPriceOverride(id, pricePerKwh, reason);

    await this.adminAuditService.logAction(
      req.user.userId,
      'override_charger_price',
      'charger',
      id,
      { newPrice: pricePerKwh, reason },
      reason,
      ip,
    );

    return charger;
  }

  /**
   * Get charger owner details for admin
   */
  @Get('chargers/:id/owner')
  async getChargerOwner(@Param('id') id: string) {
    return this.adminService.getChargerOwnerDetails(id);
  }

  /**
   * Contact charger owner via chat
   */
  @Post('chargers/:id/contact-owner')
  async contactChargerOwner(
    @Request() req,
    @Param('id') chargerId: string,
    @Body('message') message: string,
  ) {
    const owner = await this.adminService.getChargerOwnerDetails(chargerId);
    return this.initiateChat(req, { body: { targetUserId: owner.id, initialMessage: message } } as any);
  }

  // ==================== MARKETPLACE SELLER MANAGEMENT ====================

  /**
   * Get all marketplace listings with admin filters
   */
  @Get('marketplace/listings')
  async getMarketplaceListings(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
    @Query('search') search: string,
  ) {
    return this.adminService.getMarketplaceListings({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      search,
    });
  }

  /**
   * Approve marketplace listing
   */
  @Put('marketplace/listings/:id/approve')
  async approveMarketplaceListing(
    @Request() req,
    @Param('id') id: string,
    @Body('adminNotes') adminNotes?: string,
    @Ip() ip?: string,
  ) {
    const listing = await this.adminService.approveMarketplaceListing(id, adminNotes);

    await this.adminAuditService.logAction(
      req.user.userId,
      'approve_listing',
      'marketplace_listing',
      id,
      { adminNotes },
      adminNotes,
      ip,
    );

    return listing;
  }

  /**
   * Reject marketplace listing
   */
  @Put('marketplace/listings/:id/reject')
  async rejectMarketplaceListing(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Ip() ip?: string,
  ) {
    const listing = await this.adminService.rejectMarketplaceListing(id, reason);

    await this.adminAuditService.logAction(
      req.user.userId,
      'reject_listing',
      'marketplace_listing',
      id,
      { reason },
      reason,
      ip,
    );

    return listing;
  }

  /**
   * Edit marketplace listing (admin override)
   */
  @Put('marketplace/listings/:id/edit')
  async editMarketplaceListing(
    @Request() req,
    @Param('id') id: string,
    @Body() updates: any,
    @Ip() ip?: string,
  ) {
    const listing = await this.adminService.editMarketplaceListing(id, updates);

    await this.adminAuditService.logAction(
      req.user.userId,
      'edit_listing',
      'marketplace_listing',
      id,
      { updates },
      'Admin edited listing',
      ip,
    );

    return listing;
  }

  /**
   * Contact seller via chat
   */
  @Post('marketplace/sellers/:id/contact')
  async contactSeller(
    @Request() req,
    @Param('id') sellerId: string,
    @Body('message') message: string,
  ) {
    return this.initiateChat(req, { body: { targetUserId: sellerId, initialMessage: message } } as any);
  }

  /**
   * Suspend seller account
   */
  @Put('marketplace/sellers/:id/suspend')
  async suspendSeller(
    @Request() req,
    @Param('id') sellerId: string,
    @Body('suspend') suspend: boolean,
    @Body('reason') reason: string,
    @Ip() ip?: string,
  ) {
    const result = await this.adminService.suspendSeller(sellerId, suspend, reason);

    await this.adminAuditService.logAction(
      req.user.userId,
      suspend ? 'suspend_seller' : 'resume_seller',
      'user',
      sellerId,
      { reason },
      reason,
      ip,
    );

    return result;
  }

  /**
   * Ban marketplace listing
   */
  @Post('marketplace/listings/:id/ban')
  async banMarketplaceListing(@Param('id') id: string) {
    return this.adminService.banMarketplaceListing(id);
  }

  /**
   * Unban marketplace listing
   */
  @Post('marketplace/listings/:id/unban')
  async unbanMarketplaceListing(@Param('id') id: string) {
    return this.adminService.unbanMarketplaceListing(id);
  }

  /**
   * Ban seller (prevents new listings)
   */
  @Post('marketplace/sellers/:id/ban')
  async banSeller(@Param('id') sellerId: string) {
    return this.adminService.banSeller(sellerId);
  }

  /**
   * Unban seller
   */
  @Post('marketplace/sellers/:id/unban')
  async unbanSeller(@Param('id') sellerId: string) {
    return this.adminService.unbanSeller(sellerId);
  }

  // ==================== ENHANCED MECHANIC MANAGEMENT ====================

  /**
   * Verify mechanic credentials
   */
  @Put('mechanics/:id/verify')
  async verifyMechanic(
    @Request() req,
    @Param('id') id: string,
    @Body('verified') verified: boolean,
    @Body('notes') notes?: string,
    @Ip() ip?: string,
  ) {
    const mechanic = await this.adminService.verifyMechanic(id, verified, notes);

    await this.adminAuditService.logAction(
      req.user.userId,
      verified ? 'verify_mechanic' : 'unverify_mechanic',
      'mechanic',
      id,
      { notes },
      notes,
      ip,
    );

    return mechanic;
  }

  /**
   * Suspend mechanic
   */
  @Put('mechanics/:id/suspend')
  async suspendMechanic(
    @Request() req,
    @Param('id') id: string,
    @Body('suspend') suspend: boolean,
    @Body('reason') reason: string,
    @Ip() ip?: string,
  ) {
    const mechanic = await this.adminService.suspendMechanic(id, suspend, reason);

    await this.adminAuditService.logAction(
      req.user.userId,
      suspend ? 'suspend_mechanic' : 'resume_mechanic',
      'mechanic',
      id,
      { reason },
      reason,
      ip,
    );

    return mechanic;
  }

  /**
   * Contact mechanic via chat
   */
  @Post('mechanics/:id/contact')
  async contactMechanic(
    @Request() req,
    @Param('id') mechanicId: string,
    @Body('message') message: string,
  ) {
    const mechanic = await this.adminService.getMechanicById(mechanicId);
    return this.initiateChat(req, { body: { targetUserId: mechanic.userId, initialMessage: message } } as any);
  }

  /**
   * Get mechanic job history
   */
  @Get('mechanics/:id/jobs')
  async getMechanicJobs(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.adminService.getMechanicJobs(
      id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  // ==================== HOLD/RELEASE CONTROLS ====================

  /**
   * Hold approved charger (temporarily disable)
   */
  @Put('chargers/:id/hold')
  async holdCharger(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Ip() ip?: string,
  ) {
    const charger = await this.adminService.holdCharger(id, reason);

    await this.adminAuditService.logAction(
      req.user.userId,
      'hold_charger',
      'charger',
      id,
      { reason, previousStatus: charger.metadata?.previousStatus },
      reason,
      ip,
    );

    return { success: true, charger, message: 'Charger held successfully' };
  }

  /**
   * Release held charger (restore to active)
   */
  @Put('chargers/:id/release')
  async releaseCharger(
    @Request() req,
    @Param('id') id: string,
    @Body('notes') notes?: string,
    @Ip() ip?: string,
  ) {
    const charger = await this.adminService.releaseCharger(id, notes);

    await this.adminAuditService.logAction(
      req.user.userId,
      'release_charger',
      'charger',
      id,
      { notes },
      notes,
      ip,
    );

    return { success: true, charger, message: 'Charger released successfully' };
  }

  /**
   * Hold approved marketplace listing
   */
  @Put('marketplace/listings/:id/hold')
  async holdListing(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Ip() ip?: string,
  ) {
    const listing = await this.adminService.holdListing(id, reason);

    await this.adminAuditService.logAction(
      req.user.userId,
      'hold_listing',
      'marketplace_listing',
      id,
      { reason },
      reason,
      ip,
    );

    return { success: true, listing, message: 'Listing held successfully' };
  }

  /**
   * Release held marketplace listing
   */
  @Put('marketplace/listings/:id/release')
  async releaseListing(
    @Request() req,
    @Param('id') id: string,
    @Body('notes') notes?: string,
    @Ip() ip?: string,
  ) {
    const listing = await this.adminService.releaseListing(id, notes);

    await this.adminAuditService.logAction(
      req.user.userId,
      'release_listing',
      'marketplace_listing',
      id,
      { notes },
      notes,
      ip,
    );

    return { success: true, listing, message: 'Listing released successfully' };
  }

  /**
   * Hold approved mechanic (temporarily disable)
   */
  @Put('mechanics/:id/hold')
  async holdMechanic(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Ip() ip?: string,
  ) {
    const mechanic = await this.adminService.holdMechanic(id, reason);

    await this.adminAuditService.logAction(
      req.user.userId,
      'hold_mechanic',
      'mechanic',
      id,
      { reason },
      reason,
      ip,
    );

    return { success: true, mechanic, message: 'Mechanic held successfully' };
  }

  /**
   * Release held mechanic (restore to active)
   */
  @Put('mechanics/:id/release')
  async releaseMechanic(
    @Request() req,
    @Param('id') id: string,
    @Body('notes') notes?: string,
    @Ip() ip?: string,
  ) {
    const mechanic = await this.adminService.releaseMechanic(id, notes);

    await this.adminAuditService.logAction(
      req.user.userId,
      'release_mechanic',
      'mechanic',
      id,
      { notes },
      notes,
      ip,
    );

    return { success: true, mechanic, message: 'Mechanic released successfully' };
  }

  // ==================== AUDIT LOG ====================

  /**
   * Get admin action history
   */
  @Get('audit/actions')
  async getAuditLog(
    @Query('adminId') adminId: string,
    @Query('targetType') targetType: string,
    @Query('targetId') targetId: string,
    @Query('actionType') actionType: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.adminAuditService.getActionHistory(
      {
        adminId,
        targetType,
        targetId,
        actionType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }
}
