/**
 * Combat UI - UI creation for combat and raid
 * Handles creating Discord embeds and components for combat interfaces
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getStatIcons, renderTextBar, getElementViNameOrNone } = require('./CombatHelpers');

class CombatUI {
  /**
   * Create UI for solo combat
   * @param {Object} combat - Combat object
   * @returns {Object} Discord embed and components
   */
  createCombatUI(combat) {
    const p = combat.player;
    const m = combat.monster;
    const icons = getStatIcons();
    const fmtBar = (cur, max) => renderTextBar(cur, max, 16);
    const fmtNum = (n) => {
      const num = parseFloat(n) || 0;
      return num.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
    const fmtNumWithComma = (n) => {
      const num = parseFloat(n) || 0;
      const parts = num.toFixed(1).split('.');
      const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `${intPart}.${parts[1]}`;
    };

    // Get element emoji
    const getElementEmoji = (element) => {
      const map = {
        'kim': '⚔️', 'moc': '🌿', 'thuy': '💧', 'hoa': '🔥', 'tho': '🏔️',
        'phong': '🌪️', 'loi': '⚡', 'vo_he': '🌀'
      };
      return map[element] || '⚫';
    };

    // Get variant rarity icon
    const getVariantRarityIcon = (variant, isBoss = false) => {
      if (isBoss) return '👑'; // Boss
      if (!variant || variant === 'normal') return '✦'; // Normal
      if (variant === 'mutated') return '✧'; // Mutated
      if (variant === 'super_mutated') return '✸'; // Super Mutated
      return '✦'; // Mặc định
    };

    // Format entity với layout cải thiện
    const fmt = (e, isPlayer = false) => {
      const s = e.stats || {};
      const currentHp = isNaN(e.currentHp) ? 0 : Math.max(0, e.currentHp);
      const currentMp = isNaN(e.currentMp) ? 0 : Math.max(0, e.currentMp);
      const maxHp = isNaN(s.hp) ? 0 : (s.hp || 0);
      const maxMp = isNaN(s.mp) ? 0 : (s.mp || 0);
      const elem = e.spiritRoot || e.element || 'vo_he';
      const elemName = getElementViNameOrNone(elem);
      const elemEmoji = getElementEmoji(elem);
      const hpPercent = maxHp > 0 ? Math.round((currentHp / maxHp) * 100) : 0;
      const mpPercent = maxMp > 0 ? Math.round((currentMp / maxMp) * 100) : 0;

      // Format stats mỗi chỉ số 1 dòng (giảm khoảng cách - không có dòng trống giữa các stat)
      const statsText =
        `${icons.atk} ATK: ${fmtNum(s.attack || 0)}\n` +
        `${icons.def} DEF: ${fmtNum(s.defense || 0)}\n` +
        `${icons.spd} SPD: ${fmtNum(s.speed || 0)}\n` +
        `${icons.regen} Regen: ${fmtNum(s.regen || 0)}\n` +
        `🎯 ACC: ${fmtNum(s.accuracy || 0)}%\n` +
        `${icons.eva} EVA: ${fmtNum(s.evasion || 0)}%\n` +
        `${icons.crit} Crit: ${fmtNum(s.critical || 0)}%\n` +
        `🔪 PEN: ${fmtNum(s.penetration || 0)}`;

      // Progress bar cho HP/MP
      const hpBar = fmtBar(Math.round(currentHp), Math.round(maxHp));
      const mpBar = fmtBar(Math.round(currentMp), Math.round(maxMp));

      // Format tên: icon nguyên tố ở đầu, icon độ hiếm ở cuối (chỉ cho quái)
      let nameDisplay = '';
      if (!isPlayer) {
        // Làm sạch tên quái: loại bỏ emoji và variant name cũ
        let cleanName = e.name;
        // Loại bỏ emoji variant cũ (✦, ✧, ✸, 👑, 💀, 🔴)
        cleanName = cleanName.replace(/[✦✧✸👑💀🔴]/g, '').trim();
        // Loại bỏ variant name cũ
        cleanName = cleanName.replace(/\s*(Biến Dị|Biến dị|Siêu Biến Dị|Siêu biến dị)\s*/gi, '').trim();
        // Loại bỏ (BOSS)
        cleanName = cleanName.replace(/\s*\(BOSS\)\s*/gi, '').trim();

        // Lấy icon độ hiếm
        const rarityIcon = getVariantRarityIcon(e.variant, e.isBoss);

        // Format: icon nguyên tố + tên + icon độ hiếm
        nameDisplay = `${elemEmoji} **${cleanName}** ${rarityIcon}`;
      } else {
        // Người chơi chỉ hiển thị icon nguyên tố
        nameDisplay = `${elemEmoji} **${e.name}**`;
      }

      // Format với code block để tách rõ
      return `${nameDisplay}\n` +
        `\n` +
        `${icons.hp} ${hpBar}\n` +
        `     ${fmtNumWithComma(currentHp)} / ${fmtNumWithComma(maxHp)} (${hpPercent}%)\n` +
        `\n` +
        `${icons.mp} ${mpBar}\n` +
        `     ${fmtNumWithComma(currentMp)} / ${fmtNumWithComma(maxMp)} (${mpPercent}%)\n` +
        `\n` +
        `${statsText}\n`;
    };

    const apText = combat.playerApBonus > 0
      ? `${icons.ap} AP: ${combat.playerAp}/${combat.playerApMax} (+${combat.playerApBonus})`
      : `${icons.ap} AP: ${combat.playerAp}/${combat.playerApMax}`;

    // Format combat log với icon và format mới
    const formatLogEntry = (entry) => {
      if (!entry) return '';

      let formatted = entry;
      let icon = '⚔️'; // Icon mặc định

      // Loại bỏ tất cả emoji thừa ở đầu dòng (🧠, ⚔️, ✨, 🎲, etc.)
      formatted = formatted.replace(/^[🧠⚔️✨🎲🛡⛔🔄🔥🐌]+\s*/g, '').trim();

      // Loại bỏ các bold hiện có (trừ khi là tên)
      formatted = formatted.replace(/\*\*/g, '');

      // Bỏ emoji variant trước tên quái (⭐⭐, ⭐⭐⭐, etc.)
      formatted = formatted.replace(/⭐+/g, '').trim();

      // Xác định icon dựa trên nội dung
      if (formatted.includes('đi trước') || formatted.includes('Initiative')) {
        icon = '🎲';
      } else if (formatted.includes('phòng thủ') || formatted.includes('DEF')) {
        icon = '🛡';
      } else if (formatted.includes('tấn công') || formatted.includes('attack') || formatted.includes('dùng vũ khí')) {
        icon = '⚔️';
      } else if (formatted.includes('kỹ năng') || formatted.includes('skill') || formatted.includes('dùng') || formatted.includes('sử dụng')) {
        icon = '✨';
      } else if (formatted.includes('choáng') || formatted.includes('stun')) {
        icon = '⛔';
      } else if (formatted.includes('phản kích') || formatted.includes('counter')) {
        icon = '🔄';
      } else if (formatted.includes('cháy') || formatted.includes('burn')) {
        icon = '🔥';
      } else if (formatted.includes('chậm') || formatted.includes('slow')) {
        icon = '🐌';
      }

      // Tên người chơi in đậm
      formatted = formatted.replace(new RegExp(`\\b${p.name}\\b`, 'g'), `**${p.name}**`);

      // Tên quái in đậm với icon độ hiếm ở sau tên (không ở đầu)
      // Loại bỏ icon độ hiếm ở đầu dòng nếu có
      formatted = formatted.replace(/^[✦✧✸👑]\s+/, '').trim();

      // Làm sạch tên quái: loại bỏ emoji và variant name cũ
      let cleanMonsterName = m.name;
      cleanMonsterName = cleanMonsterName.replace(/[✦✧✸👑💀🔴]/g, '').trim();
      cleanMonsterName = cleanMonsterName.replace(/\s*(Biến Dị|Biến dị|Siêu Biến Dị|Siêu biến dị)\s*/gi, '').trim();
      cleanMonsterName = cleanMonsterName.replace(/\s*\(BOSS\)\s*/gi, '').trim();

      const monsterNamePattern = new RegExp(`\\b${m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

      // Lấy icon độ hiếm
      const rarityIcon = getVariantRarityIcon(m.variant, m.isBoss);

      // Hiển thị tên quái với icon độ hiếm ở sau tên
      formatted = formatted.replace(monsterNamePattern, `**${cleanMonsterName}** ${rarityIcon}`);

      // Chuyển "sử dụng" thành "dùng"
      formatted = formatted.replace(/sử dụng/gi, 'dùng');

      // Format damage TRƯỚC để tránh match sai trong format skill name
      // Format damage: "gây X sát thương" -> "-> X sát thương" (không in đậm)
      formatted = formatted.replace(/(?:gây|Gây)\s+(\d+\.?\d*)\s+sát thương/gi, '-> $1 sát thương');
      // Format damage có sẵn: "→ X sát thương" -> "-> X sát thương"
      formatted = formatted.replace(/→\s+(\d+\.?\d*)\s+sát thương/gi, '-> $1 sát thương');

      // In đậm tên kỹ năng và loại bỏ dấu chấm than, dấu ngoặc kép thừa
      // Pattern: match "dùng" + tên skill (có thể có dấu ngoặc kép), dừng lại trước -> hoặc số
      formatted = formatted.replace(/dùng\s+([^->0-9]+?)(?:\s*->|\s*!|$)/g, (match, skillPart) => {
        // Loại bỏ dấu ngoặc kép thừa và trim
        let cleanSkillName = skillPart.trim().replace(/^"+|"+$/g, '').trim();
        // Nếu skillName rỗng, giữ nguyên match
        if (!cleanSkillName) return match;
        return `dùng **"${cleanSkillName}"**`;
      });

      // Critical -> **CRITICAL** (bold + caps)
      formatted = formatted.replace(/CRITICAL/gi, '**CRITICAL**');

      // Viết tắt stat in hoa và loại bỏ từ thừa
      formatted = formatted.replace(/attack/gi, 'ATK');
      formatted = formatted.replace(/defense/gi, 'DEF');
      formatted = formatted.replace(/speed/gi, 'SPD');
      formatted = formatted.replace(/accuracy/gi, 'ACC');
      formatted = formatted.replace(/evasion/gi, 'EVA');
      formatted = formatted.replace(/critical/gi, 'CRIT');
      formatted = formatted.replace(/penetration/gi, 'PEN');

      // Format initiative và các message đặc biệt
      if (formatted.includes('Initiative') || formatted.includes('đi trước')) {
        formatted = formatted.replace(/Initiative:?\s*/i, '').replace(/Bạn đi trước/i, 'Bạn đi trước');
      }

      // Loại bỏ dấu cuối câu
      formatted = formatted.replace(/[.!?]+$/g, '').trim();

      // Loại bỏ emoji thừa
      formatted = formatted.replace(/⚔️|🗡️/g, '').trim();

      // Format hiệu ứng: thêm "+" trước %, đổi "trong X lượt" thành "(X lượt)"
      // Tăng/Giảm +X% (Y lượt)
      // Pattern: "Tăng DEF 15%" -> "Tăng DEF +15%"
      formatted = formatted.replace(/(Tăng|tăng)\s+([A-Z]+)\s+(\d+)%/gi, (match, action, stat, percent) => {
        return `${action} ${stat} +${percent}%`;
      });
      // Pattern: "Giảm DEF 15%" -> "Giảm DEF -15%"
      formatted = formatted.replace(/(Giảm|giảm)\s+([A-Z]+)\s+(\d+)%/gi, (match, action, stat, percent) => {
        return `${action} ${stat} -${percent}%`;
      });
      // Pattern: "trong X lượt" -> "(X lượt)"
      formatted = formatted.replace(/trong\s+(\d+)\s+lượt/gi, '($1 lượt)');

      // Tách log thành nhiều dòng CHỈ KHI CÓ HIỆU ỨNG (buff/debuff)
      // Kiểm tra xem có từ khóa hiệu ứng không
      const effectKeywords = /(tăng|giảm|bị|sẽ|miễn nhiễm|kích hoạt|hồi|khiêu khích)/i;
      const hasEffects = effectKeywords.test(formatted);

      // Chỉ tách log nếu có hiệu ứng
      if (hasEffects) {
        const namePattern = /\*\*[^*]+\*\*/g;
        const names = formatted.match(namePattern) || [];

        if (names.length > 1) {
          // Có nhiều phần với nhiều tên, tách thành nhiều dòng
          const parts = [];
          let currentIndex = 0;

          // Tách dựa trên vị trí của mỗi tên
          for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const nameIndex = formatted.indexOf(name, currentIndex);

            if (i === 0) {
              // Phần đầu: từ đầu đến hết tên đầu tiên
              const firstPart = formatted.substring(0, nameIndex + name.length).trim();
              if (firstPart) {
                parts.push(`${icon} ${firstPart}`);
              }
            } else {
              // Phần tiếp theo: từ sau tên trước đến hết tên hiện tại
              const prevName = names[i - 1];
              const prevNameIndex = formatted.indexOf(prevName, currentIndex - prevName.length);
              const prevNameEnd = prevNameIndex + prevName.length;
              const segment = formatted.substring(prevNameEnd, nameIndex + name.length).trim();

              if (segment) {
                // Loại bỏ tên trùng lặp nếu cùng một tên
                const cleanSegment = segment.replace(new RegExp(`^\\*\\*${name.replace(/\*/g, '')}\\*\\*\\s*`), '');
                if (cleanSegment) {
                  parts.push(`    -> ${cleanSegment}`);
                } else {
                  parts.push(`    -> ${segment}`);
                }
              }
            }

            currentIndex = nameIndex + name.length;
          }

          // Phần cuối (sau tên cuối cùng)
          const lastName = names[names.length - 1];
          const lastNameIndex = formatted.lastIndexOf(lastName);
          const lastNameEnd = lastNameIndex + lastName.length;
          const lastSegment = formatted.substring(lastNameEnd).trim();

          if (lastSegment) {
            parts.push(`    -> ${lastSegment}`);
          }

          if (parts.length > 1) {
            return parts.join('\n');
          }
        } else if (names.length === 1) {
          // Có một tên nhưng có nhiều hiệu ứng, tách dựa trên từ khóa
          const effectPattern = /(tăng|giảm|bị|sẽ|miễn nhiễm|kích hoạt|hồi|khiêu khích)/gi;
          const matches = [...formatted.matchAll(effectPattern)];

          if (matches.length > 1) {
            // Có nhiều hiệu ứng, tách thành nhiều dòng
            const parts = [];
            const name = names[0];
            const nameIndex = formatted.indexOf(name);

            // Tìm phần đầu (từ đầu đến hết phần chính, có thể có "dùng", "sử dụng", "gây sát thương")
            // Tìm vị trí hiệu ứng đầu tiên
            const firstEffectIndex = matches[0].index;
            let firstPartEnd = firstEffectIndex;

            // Nếu có "gây sát thương" trước hiệu ứng đầu tiên, bao gồm nó
            const damagePattern = /->\s+[\d.]+\s+sát thương/i;
            const damageMatch = formatted.substring(0, firstEffectIndex).match(damagePattern);
            if (damageMatch) {
              firstPartEnd = formatted.indexOf(damageMatch[0]) + damageMatch[0].length;
            } else {
              // Tìm dấu ngoặc kép cuối cùng (kết thúc tên kỹ năng) hoặc dấu chấm than
              const lastQuoteIndex = formatted.lastIndexOf('"', firstEffectIndex);
              const exclamationIndex = formatted.indexOf('!', nameIndex + name.length);

              if (lastQuoteIndex !== -1 && lastQuoteIndex < firstEffectIndex) {
                firstPartEnd = lastQuoteIndex + 1; // Sau dấu ngoặc kép cuối
              } else if (exclamationIndex !== -1 && exclamationIndex < firstEffectIndex) {
                firstPartEnd = exclamationIndex + 1;
              }
            }

            const firstPart = formatted.substring(0, firstPartEnd).trim();
            parts.push(`${icon} ${firstPart}`);

            // Tách các hiệu ứng
            let lastIndex = firstPartEnd;
            for (let i = 0; i < matches.length; i++) {
              const match = matches[i];
              if (match.index >= lastIndex) {
                // Tìm điểm kết thúc của hiệu ứng này (trước hiệu ứng tiếp theo hoặc cuối chuỗi)
                let segmentEnd;
                if (i < matches.length - 1) {
                  segmentEnd = matches[i + 1].index;
                } else {
                  segmentEnd = formatted.length;
                }

                const segment = formatted.substring(lastIndex, segmentEnd).trim();
                if (segment) {
                  parts.push(`    -> ${segment}`);
                }
                lastIndex = segmentEnd;
              }
            }

            if (parts.length > 1) {
              return parts.join('\n');
            }
          }
        }
      }

      // Không có hiệu ứng hoặc chỉ có 1 phần, giữ nguyên 1 dòng
      return `${icon} ${formatted}`;
    };

    const logEntries = combat.battleLog.slice(-6).map(formatLogEntry);
    const formattedLog = logEntries.length > 0
      ? logEntries.join('\n')
      : '⚪ Chưa có hành động';

    // Title gộp turn và lượt
    const waveInfo = Array.isArray(combat.waves) ? ` • Ải ${(combat.currentWaveIndex || 0) + 1}/${combat.waves.length}` : '';
    const turnText = combat.currentTurn === 'player'
      ? `Turn ${combat.turn}${waveInfo} – Lượt của bạn`
      : `Turn ${combat.turn}${waveInfo} – Lượt: ${m.name}`;

    const embed = new EmbedBuilder()
      .setColor(combat.currentTurn === 'player' ? '#4CAF50' : '#F44336')
      .setTitle(`⚔️ ${turnText}`)
      .addFields(
        { name: '👤 **Người Chơi**', value: fmt(p, true), inline: true },
        { name: `${m.emoji || '👹'} **Đối Thủ**`, value: fmt(m), inline: true },
        { name: apText, value: '', inline: false },
        { name: '📜 **Nhật Ký Chiến Đấu**', value: formattedLog, inline: false }
      )
      .setFooter({ text: 'Chọn hành động để tiếp tục' })
      .setTimestamp();

    // Determine weapon equipped - check if player has weapon equipped, not just in inventory
    const hasWeapon = p?.equipment?.weapon && p.equipment.weapon !== null;
    const canAct = combat.currentTurn === 'player' && (combat.playerAp || 0) > 0;

    // Tất cả nút dùng Primary style khi có thể bấm, Secondary khi disabled
    const attackButton = hasWeapon
      ? new ButtonBuilder()
        .setCustomId(`combat_weapon_${combat.id}`)
        .setLabel('🗡 Vũ Khí')
        .setStyle(canAct ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canAct)
      : new ButtonBuilder()
        .setCustomId(`combat_attack_${combat.id}`)
        .setLabel('🗡 Tấn Công')
        .setStyle(canAct ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(!canAct);

    const canDefend = combat.currentTurn === 'player' && !combat.turnActions?.defended && combat.playerAp >= 1;
    const canUseSkill = combat.currentTurn === 'player' && (combat.playerAp || 0) > 0;
    const canUseItem = combat.currentTurn === 'player';

    const row = new ActionRowBuilder()
      .addComponents(
        attackButton,
        new ButtonBuilder()
          .setCustomId(`combat_defend_${combat.id}`)
          .setLabel('🛡 Phòng Thủ')
          .setStyle(canDefend ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!canDefend),
        new ButtonBuilder()
          .setCustomId(`combat_skill_${combat.id}`)
          .setLabel('🔥 Kỹ Năng')
          .setStyle(canUseSkill ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!canUseSkill),
        new ButtonBuilder()
          .setCustomId(`combat_item_${combat.id}`)
          .setLabel('🎒 Vật Phẩm')
          .setStyle(canUseItem ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!canUseItem),
        new ButtonBuilder()
          .setCustomId(`combat_flee_${combat.id}`)
          .setLabel('🚪 Chạy Trốn')
          .setStyle(canUseItem ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(!canUseItem)
      );

    // set thumbnail avatar nếu có
    try {
      const url = combat?.interaction?.client?.users?.cache?.get?.(p.userId)?.displayAvatarURL?.({ size: 64 });
      if (url) embed.setThumbnail(url);
    } catch { }

    return { embeds: [embed], components: [row] };
  }

  /**
   * Create UI for raid combat
   * @param {Object} combat - Combat object
   * @returns {Object} Discord embed and components
   */
  createRaidUI(combat) {
    const waveInfo = `Ải ${(combat.currentWaveIndex || 0) + 1}/${combat.waves.length}`;
    const currentActor = combat.party[combat.currentActorIndex];
    const apInfo = combat.currentTurn === 'party' ? `AP: ${combat.playerAp || 0}/${combat.playerApMax || 1}` : '';

    const icons = getStatIcons();
    const fmtBar = (cur, max) => renderTextBar(cur, max, 14);
    const fmt = (e) => {
      const s = e.stats || {};
      return `${e.emoji || ''} **${e.name}**\n` +
        `${icons.hp} ${fmtBar(e.currentHp, s.hp || 0)} ${Math.max(0, Math.round(e.currentHp))}/${s.hp || 0}\n` +
        `${icons.mp} ${fmtBar(e.currentMp, s.mp || 0)} ${Math.max(0, Math.round(e.currentMp))}/${s.mp || 0}\n` +
        `${icons.atk} ${s.attack || 0}  • ${icons.def} ${s.defense || 0}  • ${icons.spd} ${s.speed || 0}\n` +
        `${icons.crit} ${s.critical || 0}% • ${icons.eva} ${s.evasion || 0}% • ${icons.regen} ${s.regen || 0}`;
    };
    const partyLines = combat.party.map((p, idx) => {
      const isCurrent = idx === combat.currentActorIndex;
      const apBonus = p.apBonus > 0 ? ` ${icons.apBonus}+${p.apBonus}` : '';
      const tag = isCurrent && combat.currentTurn === 'party' ? ` (Turn • ${apInfo})` : '';
      return `• ${fmt(p)}${apBonus}${tag}`;
    }).join('\n\n');
    const monsterLines = combat.monsters.map((m) => `• ${fmt(m)}`).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('🏰 Domain Raid')
      .setDescription(`Turn ${combat.turn} • ${waveInfo} • ${combat.currentTurn === 'party' ? `Lượt: ${currentActor?.name}` : 'Lượt: Quái'}`)
      .addFields(
        { name: '👥 Party', value: partyLines || '—', inline: true },
        { name: '👹 Enemy Team', value: monsterLines || '—', inline: true },
        { name: '📜 Log', value: combat.battleLog.slice(-8).join('\n') || '—', inline: false }
      )
      .setFooter({ text: 'Chọn hành động để tiếp tục' })
      .setTimestamp();

    const isPlayerTurn = combat.currentTurn === 'party';
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`combat_attack_${combat.id}`).setLabel('⚔️ Tấn Công').setStyle(ButtonStyle.Danger).setDisabled(!isPlayerTurn || (combat.playerAp || 0) <= 0),
        new ButtonBuilder().setCustomId(`combat_defend_${combat.id}`).setLabel('🛡️ Phòng Thủ').setStyle(ButtonStyle.Secondary).setDisabled(!isPlayerTurn || combat.playerAp < 1 || (currentActor && currentActor.defended) || (combat.turnActions?.defended === true)),
        new ButtonBuilder().setCustomId(`combat_skill_${combat.id}`).setLabel('✨ Kỹ Năng').setStyle(ButtonStyle.Primary).setDisabled(!isPlayerTurn || (combat.playerAp || 0) <= 0),
        new ButtonBuilder().setCustomId(`combat_item_${combat.id}`).setLabel('🧪 Vật Phẩm').setStyle(ButtonStyle.Success).setDisabled(!isPlayerTurn),
        new ButtonBuilder().setCustomId(`combat_flee_${combat.id}`).setLabel('🏃 Rời Raid').setStyle(ButtonStyle.Danger).setDisabled(!isPlayerTurn)
      );

    return { embeds: [embed], components: [row] };
  }
}

module.exports = CombatUI;

