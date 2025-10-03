const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class RaidManager {
  constructor() {
    this.lobbies = new Map(); // lobbyId -> { hostId, party:Set, createdAt, channelId, messageId, maxSize }
    this.hostToLobby = new Map(); // hostId -> lobbyId
  }

  createLobby(hostId, channelId, options = {}) {
    const lobbyId = `${hostId}_${Date.now()}`;
    const lobby = {
      id: lobbyId,
      hostId,
      party: new Set([hostId]),
      createdAt: Date.now(),
      channelId: channelId || null,
      messageId: null,
      maxSize: options.maxSize || 5
    };
    this.lobbies.set(lobbyId, lobby);
    this.hostToLobby.set(hostId, lobbyId);
    return lobby;
  }

  getLobby(lobbyId) {
    return this.lobbies.get(lobbyId) || null;
  }

  joinLobby(lobbyId, userId) {
    const lobby = this.getLobby(lobbyId);
    if (!lobby) return { ok: false, reason: 'Lobby không tồn tại' };
    if (lobby.party.has(userId)) return { ok: false, reason: 'Bạn đã ở trong lobby' };
    if (lobby.party.size >= lobby.maxSize) return { ok: false, reason: 'Lobby đã đầy' };
    lobby.party.add(userId);
    return { ok: true, lobby };
  }

  leaveLobby(lobbyId, userId) {
    const lobby = this.getLobby(lobbyId);
    if (!lobby) return { ok: false, reason: 'Lobby không tồn tại' };
    if (!lobby.party.has(userId)) return { ok: false, reason: 'Bạn không ở trong lobby' };
    lobby.party.delete(userId);
    // Nếu host rời, chuyển host cho người đầu tiên còn lại
    if (lobby.hostId === userId) {
      const first = lobby.party.values().next().value;
      lobby.hostId = first || null;
    }
    return { ok: true, lobby };
  }

  destroyLobby(lobbyId) {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      this.hostToLobby.delete(lobby.hostId);
    }
    this.lobbies.delete(lobbyId);
  }

  getLobbyByHost(hostId) {
    const id = this.hostToLobby.get(hostId);
    return id ? this.getLobby(id) : null;
  }

  getOrCreateLobbyByHost(hostId, channelId, options = {}) {
    const existing = this.getLobbyByHost(hostId);
    if (existing) return existing;
    return this.createLobby(hostId, channelId, options);
  }

  buildInviteUI(lobby, getUsername) {
    const names = Array.from(lobby.party).map(uid => `• <@${uid}>`).join('\n') || '—';
    const embed = new EmbedBuilder()
      .setColor('#8E44AD')
      .setTitle('🏰 Domain Raid - Mời Tham Gia')
      .setDescription(`Host: <@${lobby.hostId}>\nSố lượng: ${lobby.party.size}/${lobby.maxSize}`)
      .addFields({ name: '👥 Thành viên', value: names, inline: false })
      .setFooter({ text: 'Tham gia trước khi host bấm Bắt Đầu' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`domain_join_${lobby.id}`).setLabel('Tham gia').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`domain_leave_${lobby.id}`).setLabel('Rời').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`domain_start_${lobby.id}`).setLabel('Bắt đầu').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`domain_cancel_${lobby.id}`).setLabel('Hủy').setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row] };
  }
}

module.exports = new RaidManager();


