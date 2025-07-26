const { Client, GatewayIntentBits, SlashCommandBuilder, Routes } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { REST } = require('@discordjs/rest');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = 'YOUR_BOT_TOKEN';
const CLIENT_ID = 'YOUR_CLIENT_ID';
const GUILD_ID = 'YOUR_GUILD_ID';

let connection, player;

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
});

// Slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a YouTube song')
        .addStringOption(option =>
            option.setName('url')
                .setDescription('YouTube URL')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the song'),
    new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the song'),
    new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the song'),
];

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
            body: commands.map(cmd => cmd.toJSON())
        });
        console.log('✅ Slash commands registered.');
    } catch (err) {
        console.error('Error registering commands:', err);
    }
})();

// Handle interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) return interaction.reply({ content: '❌ You must be in a voice channel!', ephemeral: true });

    switch (interaction.commandName) {
        case 'play':
            const url = interaction.options.getString('url');
            if (!ytdl.validateURL(url)) return interaction.reply('❌ Invalid YouTube URL.');
            const stream = ytdl(url, { filter: 'audioonly' });

            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            player = createAudioPlayer();
            const resource = createAudioResource(stream);
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

            interaction.reply(`▶️ Playing: ${url}`);
            break;

        case 'pause':
            if (player) {
                player.pause();
                interaction.reply('⏸️ Paused');
            } else {
                interaction.reply('❌ Nothing is playing.');
            }
            break;

        case 'resume':
            if (player) {
                player.unpause();
                interaction.reply('▶️ Resumed');
            } else {
                interaction.reply('❌ Nothing is paused.');
            }
            break;

        case 'skip':
            if (player) {
                player.stop();
                interaction.reply('⏭️ Skipped');
            } else {
                interaction.reply('❌ Nothing is playing.');
            }
            break;
    }
});

client.login(TOKEN);
