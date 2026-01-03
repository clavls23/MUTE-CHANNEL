require("dotenv").config();
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const targetChannelId = process.env.TARGET_VOICE_CHANNEL_ID;
const autoUnmuteOnLeave = (process.env.AUTO_UNMUTE_ON_LEAVE ?? "true").toLowerCase() === "true";

// Optional: comma-separated role IDs exempt from muting (e.g., staff)
const exemptRoleIds = (process.env.EXEMPT_ROLE_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!token) {
  console.error("❌ Missing DISCORD_TOKEN in environment.");
  process.exit(1);
}
if (!targetChannelId) {
  console.error("❌ Missing TARGET_VOICE_CHANNEL_ID in environment.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates, // required for voiceStateUpdate
  ],
  partials: [Partials.GuildMember],
});

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🎯 Target voice channel: ${targetChannelId}`);
  console.log(`🔁 Auto-unmute on leave: ${autoUnmuteOnLeave}`);
  console.log(`🛡️ Exempt roles: ${exemptRoleIds.length ? exemptRoleIds.join(", ") : "(none)"}`);
});

/**
 * Helper: should we ignore this member?
 */
function isExempt(member) {
  if (!member) return true;
  if (member.user?.bot) return true; // don't mute bots
  if (exemptRoleIds.length && member.roles?.cache?.some((r) => exemptRoleIds.includes(r.id))) return true;
  return false;
}

/**
 * Helper: verify bot has permission to mute in this guild
 */
function botCanMute(guild, me) {
  if (!guild || !me) return false;
  // In Discord.js v14, `guild.members.me` is the bot member
  const perms = me.permissions;
  return perms?.has(PermissionsBitField.Flags.MuteMembers);
}

client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    // Voice channel IDs before/after
    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;

    // If no relevant move/join/leave, ignore
    if (oldChannelId === newChannelId) return;

    const member = newState.member ?? oldState.member;
    if (!member || isExempt(member)) return;

    const guild = newState.guild ?? oldState.guild;
    const me = guild?.members?.me;

    if (!botCanMute(guild, me)) {
      // Don't spam; but log once per event if you want
      console.warn("⚠️ Bot lacks 'Mute Members' permission in this guild.");
      return;
    }

    const joinedTarget = newChannelId === targetChannelId;
    const leftTarget = oldChannelId === targetChannelId && newChannelId !== targetChannelId;

    // 1) If user joined target channel -> server mute
    if (joinedTarget) {
      // Avoid duplicate work if already muted
      if (!member.voice?.serverMute) {
        await member.voice.setMute(true, "Auto-mute: joined target voice channel");
        console.log(`🔇 Muted ${member.user.tag} (joined target channel)`);
      }
      return;
    }

    // 2) If user left target channel -> optionally server unmute
    if (autoUnmuteOnLeave && leftTarget) {
      if (member.voice?.serverMute) {
        await member.voice.setMute(false, "Auto-unmute: left target voice channel");
        console.log(`🔊 Unmuted ${member.user.tag} (left target channel)`);
      }
      return;
    }
  } catch (err) {
    console.error("❌ voiceStateUpdate error:", err);
  }
});

client.login(token);
