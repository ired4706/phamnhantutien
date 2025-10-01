const fs = require('fs');
const path = require('path');

class GuildManager {
  constructor() {
    this.guilds = new Map();
    this.dataPath = path.join(__dirname, '../../data/guilds/guilds.json');
    this.loadGuilds();
  }

  loadGuilds() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf8');
        const guildsData = JSON.parse(data);
        for (const [guildId, guild] of Object.entries(guildsData)) {
          this.guilds.set(guildId, guild);
        }
        console.log(`✅ Loaded ${this.guilds.size} guilds`);
      } else {
        fs.writeFileSync(this.dataPath, JSON.stringify({}, null, 2));
      }
    } catch (error) {
      console.error('Error loading guilds:', error);
      this.guilds = new Map();
    }
  }

  saveGuilds() {
    try {
      const data = {};
      for (const [guildId, guild] of this.guilds.entries()) {
        data[guildId] = guild;
      }
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving guilds:', error);
    }
  }

  generateGuildId(name) {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 8);
    let id = base || Math.random().toString(36).slice(2, 10);
    let counter = 1;
    while (this.guilds.has(id)) {
      id = `${base}${counter}`.slice(0, 10);
      counter += 1;
    }
    return id;
  }

  getGuild(guildId) {
    return this.guilds.get(guildId) || null;
  }

  getGuildByName(name) {
    const target = name.trim().toLowerCase();
    for (const guild of this.guilds.values()) {
      if (guild.name.trim().toLowerCase() === target) return guild;
    }
    return null;
  }

  listGuilds() {
    return Array.from(this.guilds.values());
  }

  getPlayerGuildId(userId) {
    for (const [gid, guild] of this.guilds.entries()) {
      if (guild.members.includes(userId)) return gid;
    }
    return null;
  }

  createGuild({ ownerId, ownerName, name, description = '' }) {
    if (!name || name.length < 3) {
      return { success: false, message: 'Tên bang phải có ít nhất 3 ký tự.' };
    }
    if (this.getGuildByName(name)) {
      return { success: false, message: 'Tên bang đã tồn tại.' };
    }
    if (this.getPlayerGuildId(ownerId)) {
      return { success: false, message: 'Bạn đã ở trong một bang.' };
    }

    // Check requirements
    const playerManager = require('./player.js');
    const player = playerManager.getPlayer(ownerId);
    if (!player) {
      return { success: false, message: 'Người chơi không tồn tại.' };
    }

    // Check cultivation level (trúc cơ kỳ trở lên)
    if (player.realm !== 'truc_co' && player.realm !== 'ket_dan' && player.realm !== 'nguyen_anh') {
      return { success: false, message: 'Cần đạt tu vi Trúc Cơ kỳ trở lên để thành lập bang.' };
    }

    // Check reputation (5 points minimum)
    if (player.stats.reputation < 5) {
      return { success: false, message: 'Cần ít nhất 5 điểm danh tiếng để thành lập bang.' };
    }

    // Check spirit stones (10000 minimum)
    const totalStones = (player.inventory.spiritStones.cuc_pham * 1000000) +
      (player.inventory.spiritStones.thuong_pham * 10000) +
      (player.inventory.spiritStones.trung_pham * 100) +
      player.inventory.spiritStones.ha_pham;

    if (totalStones < 10000) {
      return { success: false, message: 'Cần ít nhất 10,000 linh thạch để thành lập bang.' };
    }

    // Check for tông môn lệnh bài
    const hasToken = player.inventory.items.some(item => item.id === 'tong_mon_lenh_bai' && item.quantity > 0);
    if (!hasToken) {
      return { success: false, message: 'Cần có Tông Môn Lệnh Bài để thành lập bang.' };
    }

    // Deduct costs
    const spiritStonesToDeduct = 10000;
    let remaining = spiritStonesToDeduct;

    // Deduct from highest to lowest quality
    if (remaining > 0 && player.inventory.spiritStones.ha_pham > 0) {
      const deduct = Math.min(remaining, player.inventory.spiritStones.ha_pham);
      player.inventory.spiritStones.ha_pham -= deduct;
      remaining -= deduct;
    }

    if (remaining > 0 && player.inventory.spiritStones.trung_pham > 0) {
      const deduct = Math.min(remaining, player.inventory.spiritStones.trung_pham * 100);
      const actualDeduct = Math.floor(deduct / 100);
      player.inventory.spiritStones.trung_pham -= actualDeduct;
      remaining -= actualDeduct * 100;
    }

    if (remaining > 0 && player.inventory.spiritStones.thuong_pham > 0) {
      const deduct = Math.min(remaining, player.inventory.spiritStones.thuong_pham * 10000);
      const actualDeduct = Math.floor(deduct / 10000);
      player.inventory.spiritStones.thuong_pham -= actualDeduct;
      remaining -= actualDeduct * 10000;
    }

    if (remaining > 0 && player.inventory.spiritStones.cuc_pham > 0) {
      const deduct = Math.min(remaining, player.inventory.spiritStones.cuc_pham * 1000000);
      const actualDeduct = Math.floor(deduct / 1000000);
      player.inventory.spiritStones.cuc_pham -= actualDeduct;
      remaining -= actualDeduct * 1000000;
    }

    // Remove tông môn lệnh bài
    const tokenIndex = player.inventory.items.findIndex(item => item.id === 'tong_mon_lenh_bai');
    if (tokenIndex !== -1) {
      player.inventory.items[tokenIndex].quantity -= 1;
      if (player.inventory.items[tokenIndex].quantity <= 0) {
        player.inventory.items.splice(tokenIndex, 1);
      }
    }

    // Save player changes
    playerManager.savePlayers();

    const id = this.generateGuildId(name);
    const now = Date.now();
    const guild = {
      id,
      name,
      description,
      ownerId,
      ownerName,
      createdAt: now,
      members: [ownerId],
      roles: {
        [ownerId]: 'sect_master'
      },
      requests: [],
      applications: [],
      level: 1,
      exp: 0,
      stats: {
        totalMembers: 1,
        totalDonations: 0,
        totalPower: 0
      }
    };
    this.guilds.set(id, guild);
    this.saveGuilds();
    return { success: true, guild };
  }

  joinGuild({ userId, guildId }) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, message: 'Không tìm thấy bang.' };
    if (guild.members.includes(userId)) return { success: false, message: 'Bạn đã trong bang này.' };
    if (this.getPlayerGuildId(userId)) return { success: false, message: 'Bạn đã ở trong một bang khác.' };

    guild.members.push(userId);
    guild.stats.totalMembers = guild.members.length;
    this.saveGuilds();
    return { success: true, guild };
  }

  leaveGuild({ userId }) {
    const gid = this.getPlayerGuildId(userId);
    if (!gid) return { success: false, message: 'Bạn không ở trong bang nào.' };
    const guild = this.getGuild(gid);
    if (!guild) return { success: false, message: 'Bang không tồn tại.' };

    // Owner leaving transfers ownership to oldest remaining member or disbands if none
    if (guild.ownerId === userId) {
      const others = guild.members.filter(m => m !== userId);
      if (others.length === 0) {
        this.guilds.delete(gid);
        this.saveGuilds();
        return { success: true, disbanded: true };
      } else {
        guild.ownerId = others[0];
        guild.roles[others[0]] = 'sect_master';
      }
    }

    guild.members = guild.members.filter(m => m !== userId);
    delete guild.roles[userId];
    guild.stats.totalMembers = guild.members.length;
    this.saveGuilds();
    return { success: true, guild };
  }

  // Role management
  getPlayerRole(userId, guildId) {
    const guild = this.getGuild(guildId);
    if (!guild) return null;
    return guild.roles[userId] || 'deacon';
  }

  hasPermission(userId, guildId, requiredRoles = []) {
    const role = this.getPlayerRole(userId, guildId);
    return requiredRoles.includes(role);
  }

  promoteMember({ promoterId, targetId, guildId, newRole }) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, message: 'Bang không tồn tại.' };

    const promoterRole = this.getPlayerRole(promoterId, guildId);
    const validRoles = ['sect_master', 'elder', 'hall_master'];

    if (!validRoles.includes(promoterRole)) {
      return { success: false, message: 'Bạn không có quyền thăng chức.' };
    }

    if (!guild.members.includes(targetId)) {
      return { success: false, message: 'Người này không ở trong bang.' };
    }

    guild.roles[targetId] = newRole;
    this.saveGuilds();
    return { success: true, message: `Đã thăng chức thành ${newRole}.` };
  }

  // Invitation system
  invitePlayer({ inviterId, targetId, guildId }) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, message: 'Bang không tồn tại.' };

    const inviterRole = this.getPlayerRole(inviterId, guildId);
    if (!['sect_master', 'elder', 'hall_master'].includes(inviterRole)) {
      return { success: false, message: 'Bạn không có quyền mời người vào bang.' };
    }

    if (guild.members.includes(targetId)) {
      return { success: false, message: 'Người này đã ở trong bang.' };
    }

    if (this.getPlayerGuildId(targetId)) {
      return { success: false, message: 'Người này đã ở trong bang khác.' };
    }

    // Add to requests (invitations)
    if (!guild.requests.includes(targetId)) {
      guild.requests.push(targetId);
      this.saveGuilds();
    }

    return { success: true, message: 'Đã gửi lời mời gia nhập.' };
  }

  acceptInvitation({ userId, guildId }) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, message: 'Bang không tồn tại.' };

    if (!guild.requests.includes(userId)) {
      return { success: false, message: 'Bạn không có lời mời từ bang này.' };
    }

    guild.members.push(userId);
    guild.roles[userId] = 'deacon';
    guild.requests = guild.requests.filter(id => id !== userId);
    guild.stats.totalMembers = guild.members.length;
    this.saveGuilds();
    return { success: true, guild };
  }

  // Application system
  applyToGuild({ userId, guildId, message = '' }) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, message: 'Bang không tồn tại.' };

    if (guild.members.includes(userId)) {
      return { success: false, message: 'Bạn đã ở trong bang này.' };
    }

    if (this.getPlayerGuildId(userId)) {
      return { success: false, message: 'Bạn đã ở trong bang khác.' };
    }

    // Check if already applied
    const existingApp = guild.applications.find(app => app.userId === userId);
    if (existingApp) {
      return { success: false, message: 'Bạn đã đăng ký tham gia bang này rồi.' };
    }

    guild.applications.push({
      userId,
      message,
      appliedAt: Date.now()
    });
    this.saveGuilds();
    return { success: true, message: 'Đã gửi đơn đăng ký tham gia bang.' };
  }

  acceptApplication({ approverId, targetId, guildId }) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, message: 'Bang không tồn tại.' };

    const approverRole = this.getPlayerRole(approverId, guildId);
    if (!['sect_master', 'elder', 'hall_master'].includes(approverRole)) {
      return { success: false, message: 'Bạn không có quyền duyệt đơn đăng ký.' };
    }

    const appIndex = guild.applications.findIndex(app => app.userId === targetId);
    if (appIndex === -1) {
      return { success: false, message: 'Không tìm thấy đơn đăng ký.' };
    }

    guild.members.push(targetId);
    guild.roles[targetId] = 'deacon';
    guild.applications.splice(appIndex, 1);
    guild.stats.totalMembers = guild.members.length;
    this.saveGuilds();
    return { success: true, message: 'Đã chấp nhận đơn đăng ký.' };
  }

  rejectApplication({ approverId, targetId, guildId }) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, message: 'Bang không tồn tại.' };

    const approverRole = this.getPlayerRole(approverId, guildId);
    if (!['sect_master', 'elder', 'hall_master'].includes(approverRole)) {
      return { success: false, message: 'Bạn không có quyền từ chối đơn đăng ký.' };
    }

    const appIndex = guild.applications.findIndex(app => app.userId === targetId);
    if (appIndex === -1) {
      return { success: false, message: 'Không tìm thấy đơn đăng ký.' };
    }

    guild.applications.splice(appIndex, 1);
    this.saveGuilds();
    return { success: true, message: 'Đã từ chối đơn đăng ký.' };
  }
}

module.exports = new GuildManager();
