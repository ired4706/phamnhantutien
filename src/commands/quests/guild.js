const { EmbedBuilder } = require('discord.js');
const playerManager = require('../../systems/player.js');
const guildManager = require('../../systems/guilds.js');

module.exports = {
  name: 'guild',
  aliases: ['bang', 'clan', 'g'],
  description: 'Quản lý bang hội: create, join, leave, info, list',

  // Mapping function for role IDs to Vietnamese text
  getRoleName(roleId) {
    const roleMapping = {
      'sect_master': 'Chưởng Môn',
      'elder': 'Trưởng Lão',
      'hall_master': 'Đường Chủ',
      'deacon': 'Chấp Sự Đệ Tử'
    };
    return roleMapping[roleId] || roleId;
  },

  async execute(interaction, args) {
    const userId = interaction.user.id;
    const username = interaction.user.username;

    // Ensure the player has started
    if (!(await playerManager.hasStartedGame(userId))) {
      const notStartedEmbed = playerManager.createNotStartedEmbed();
      await interaction.reply({ embeds: [notStartedEmbed] });
      return;
    }

    const sub = (args[0] || '').toLowerCase();

    if (!sub || sub === 'help') {
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor('#8B0000')
          .setTitle('🏯 Bang Hội - Hướng Dẫn')
          .setDescription('Sử dụng các lệnh sau để quản lý bang hội:')
          .addFields(
            { name: 'Tạo bang', value: '`fguild create <tên> | [mô tả]`\n*Cần: Trúc Cơ kỳ+, 5 REP, 10k linh thạch, Tông Môn Lệnh Bài*', inline: false },
            { name: 'Đăng ký tham gia', value: '`fguild apply <guildId> [lời nhắn]`', inline: false },
            { name: 'Chấp nhận lời mời', value: '`fguild accept <guildId>`', inline: false },
            { name: 'Rời bang', value: '`fguild leave`', inline: false },
            { name: 'Thông tin bang', value: '`fguild info [guildId]`', inline: false },
            { name: 'Danh sách bang', value: '`fguild list`', inline: false },
            { name: 'Mời người vào bang', value: '`fguild invite <@user>`', inline: false },
            { name: 'Duyệt đơn đăng ký', value: '`fguild approve <@user>`', inline: false },
            { name: 'Từ chối đơn đăng ký', value: '`fguild reject <@user>`', inline: false },
            { name: 'Thăng chức', value: '`fguild promote <@user> <chức_vụ>`', inline: false },
            { name: 'Chức vụ', value: '`sect_master`, `elder`, `hall_master`, `deacon`', inline: false }
          )
        ]
      });
      return;
    }

    if (sub === 'create') {
      const name = args[1];
      const description = args.slice(2).join(' ') || '';
      if (!name) {
        await interaction.reply('❌ Vui lòng nhập tên bang. Ví dụ: `fguild create ThienHa`');
        return;
      }
      const result = guildManager.createGuild({ ownerId: userId, ownerName: username, name, description });
      if (!result.success) {
        await interaction.reply(`❌ ${result.message}`);
        return;
      }

      const g = result.guild;
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('🎉 Tạo Bang Thành Công')
        .addFields(
          {
            name: 'ID', value: `
${g.id}`, inline: true
          },
          { name: 'Tên', value: g.name, inline: true },
          { name: 'Chủ bang', value: `<@${g.ownerId}>`, inline: true },
          { name: 'Mô tả', value: g.description || '—', inline: false },
          { name: 'Thành viên', value: `${g.members.length}`, inline: true },
          { name: 'Cấp độ', value: `${g.level}`, inline: true },
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'apply') {
      const gid = args[1];
      const message = args.slice(2).join(' ') || '';
      if (!gid) {
        await interaction.reply('❌ Vui lòng nhập ID bang. Ví dụ: `fguild apply thienha Xin chào bang!`');
        return;
      }
      const result = guildManager.applyToGuild({ userId, guildId: gid, message });
      if (!result.success) {
        await interaction.reply(`❌ ${result.message}`);
        return;
      }
      await interaction.reply(`✅ Đã gửi đơn đăng ký tham gia bang. Chờ phê duyệt từ chưởng môn, trưởng lão hoặc đường chủ.`);
      return;
    }

    if (sub === 'accept') {
      const gid = args[1];
      if (!gid) {
        await interaction.reply('❌ Vui lòng nhập ID bang. Ví dụ: `fguild accept thienha`');
        return;
      }
      const result = guildManager.acceptInvitation({ userId, guildId: gid });
      if (!result.success) {
        await interaction.reply(`❌ ${result.message}`);
        return;
      }
      const g = result.guild;
      await interaction.reply(`✅ Bạn đã tham gia bang **${g.name}** (ID: ${g.id}).`);
      return;
    }

    if (sub === 'leave') {
      const result = guildManager.leaveGuild({ userId });
      if (!result.success) {
        await interaction.reply(`❌ ${result.message}`);
        return;
      }
      if (result.disbanded) {
        await interaction.reply('🏯 Bạn rời bang và bang đã bị giải tán do không còn thành viên.');
      } else {
        await interaction.reply('✅ Bạn đã rời bang hiện tại.');
      }
      return;
    }

    if (sub === 'info') {
      const gid = args[1] || guildManager.getPlayerGuildId(userId);
      if (!gid) {
        await interaction.reply('ℹ️ Bạn chưa ở trong bang nào. Dùng `fguild create` hoặc `fguild apply`.');
        return;
      }
      const g = guildManager.getGuild(gid);
      if (!g) {
        await interaction.reply('❌ Không tìm thấy bang với ID này.');
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#00BFFF')
        .setTitle(`🏯 ${g.name}`)
        .addFields(
          { name: 'ID', value: `${g.id}`, inline: true },
          { name: 'Chủ bang', value: `<@${g.ownerId}>`, inline: true },
          { name: 'Thành viên', value: `${g.members.length}`, inline: true },
          { name: 'Mô tả', value: g.description || '—', inline: false },
          { name: 'Cấp độ', value: `${g.level}`, inline: true },
          { name: 'Kinh nghiệm', value: `${g.exp}`, inline: true },
        )
        .setFooter({ text: 'Dùng fguild list để xem danh sách các bang.' })
        .setTimestamp();

      // Show members with roles
      const membersWithRoles = g.members.slice(0, 10).map((m, idx) => {
        const role = g.roles[m] || 'deacon';
        const roleEmoji = {
          'sect_master': '👑',
          'elder': '🧙',
          'hall_master': '⚔️',
          'deacon': '👤'
        }[role] || '👤';
        const roleName = this.getRoleName(role);
        return `${idx + 1}. ${roleEmoji} <@${m}> (${roleName})`;
      }).join('\n');

      if (membersWithRoles) embed.addFields({ name: 'Thành viên (tối đa 10)', value: membersWithRoles, inline: false });

      // Show pending applications if user has permission
      const userRole = guildManager.getPlayerRole(userId, gid);
      if (['sect_master', 'elder', 'hall_master'].includes(userRole) && g.applications.length > 0) {
        const appsList = g.applications.slice(0, 5).map(app => `• <@${app.userId}>: ${app.message || 'Không có lời nhắn'}`).join('\n');
        embed.addFields({ name: 'Đơn đăng ký chờ duyệt', value: appsList, inline: false });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'list') {
      const list = guildManager.listGuilds();
      if (list.length === 0) {
        await interaction.reply('📭 Hiện chưa có bang nào. Hãy là người đầu tiên với `fguild create <tên>`!');
        return;
      }
      const embed = new EmbedBuilder()
        .setColor('#32CD32')
        .setTitle('📜 Danh Sách Bang')
        .setDescription(list.map(g => `• 🏯 **${g.name}** (ID: 
${g.id}) — 👥 ${g.members.length}`).join('\n'))
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'invite') {
      const targetUser = interaction.options?.getUser('user') || (args[1] ? { id: args[1].replace(/[<@!>]/g, '') } : null);
      if (!targetUser) {
        await interaction.reply('❌ Vui lòng mention người dùng hoặc nhập ID. Ví dụ: `fguild invite @user`');
        return;
      }

      const gid = guildManager.getPlayerGuildId(userId);
      if (!gid) {
        await interaction.reply('❌ Bạn phải ở trong bang để mời người khác.');
        return;
      }

      const result = guildManager.invitePlayer({ inviterId: userId, targetId: targetUser.id, guildId: gid });
      if (!result.success) {
        await interaction.reply(`❌ ${result.message}`);
        return;
      }

      await interaction.reply(`✅ Đã gửi lời mời gia nhập bang cho <@${targetUser.id}>. Họ có thể dùng \`fguild accept ${gid}\` để tham gia.`);
      return;
    }

    if (sub === 'approve') {
      const targetUser = interaction.options?.getUser('user') || (args[1] ? { id: args[1].replace(/[<@!>]/g, '') } : null);
      if (!targetUser) {
        await interaction.reply('❌ Vui lòng mention người dùng hoặc nhập ID. Ví dụ: `fguild approve @user`');
        return;
      }

      const gid = guildManager.getPlayerGuildId(userId);
      if (!gid) {
        await interaction.reply('❌ Bạn phải ở trong bang để duyệt đơn đăng ký.');
        return;
      }

      const result = guildManager.acceptApplication({ approverId: userId, targetId: targetUser.id, guildId: gid });
      if (!result.success) {
        await interaction.reply(`❌ ${result.message}`);
        return;
      }

      await interaction.reply(`✅ Đã chấp nhận đơn đăng ký của <@${targetUser.id}>. Họ đã tham gia bang!`);
      return;
    }

    if (sub === 'reject') {
      const targetUser = interaction.options?.getUser('user') || (args[1] ? { id: args[1].replace(/[<@!>]/g, '') } : null);
      if (!targetUser) {
        await interaction.reply('❌ Vui lòng mention người dùng hoặc nhập ID. Ví dụ: `fguild reject @user`');
        return;
      }

      const gid = guildManager.getPlayerGuildId(userId);
      if (!gid) {
        await interaction.reply('❌ Bạn phải ở trong bang để từ chối đơn đăng ký.');
        return;
      }

      const result = guildManager.rejectApplication({ approverId: userId, targetId: targetUser.id, guildId: gid });
      if (!result.success) {
        await interaction.reply(`❌ ${result.message}`);
        return;
      }

      await interaction.reply(`✅ Đã từ chối đơn đăng ký của <@${targetUser.id}>.`);
      return;
    }

    if (sub === 'promote') {
      const targetUser = interaction.options?.getUser('user') || (args[1] ? { id: args[1].replace(/[<@!>]/g, '') } : null);
      const newRole = args[2];

      if (!targetUser || !newRole) {
        await interaction.reply('❌ Vui lòng nhập đầy đủ. Ví dụ: `fguild promote @user elder`');
        return;
      }

      const validRoles = ['sect_master', 'elder', 'hall_master', 'deacon'];
      if (!validRoles.includes(newRole)) {
        await interaction.reply(`❌ Chức vụ không hợp lệ. Các chức vụ: ${validRoles.join(', ')}`);
        return;
      }

      const gid = guildManager.getPlayerGuildId(userId);
      if (!gid) {
        await interaction.reply('❌ Bạn phải ở trong bang để thăng chức.');
        return;
      }

      const result = guildManager.promoteMember({ promoterId: userId, targetId: targetUser.id, guildId: gid, newRole });
      if (!result.success) {
        await interaction.reply(`❌ ${result.message}`);
        return;
      }

      await interaction.reply(`✅ Đã thăng chức <@${targetUser.id}> thành **${this.getRoleName(newRole)}**.`);
      return;
    }

    await interaction.reply('❌ Lệnh không hợp lệ. Dùng `fguild help` để xem hướng dẫn.');
  }
};
