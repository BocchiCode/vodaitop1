// netlify/functions/getRiotChampionStats.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Lấy API Key từ biến môi trường của Netlify (sẽ cài đặt ở Bước 5)
  const RIOT_API_KEY = process.env.RIOT_API_KEY;
  if (!RIOT_API_KEY) {
    return { statusCode: 500, body: "Riot API Key not configured." };
  }

  // Lấy summonerName từ request (ví dụ: /.netlify/functions/getRiotChampionStats?name=TenNguoiChoi)
  const summonerName = event.queryStringParameters.name;
  if (!summonerName) {
    return { statusCode: 400, body: "Please provide a summoner name." };
  }

  try {
    // Luồng gọi API của Riot giữ nguyên
    const puuidResponse = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/SEA`, {
      headers: { "X-Riot-Token": RIOT_API_KEY }
    });
    if (!puuidResponse.ok) throw new Error("Summoner not found.");
    const puuidData = await puuidResponse.json();
    const puuid = puuidData.puuid;

    const summonerResponse = await fetch(`https://vn2.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, {
      headers: { "X-Riot-Token": RIOT_API_KEY }
    });
    const summonerData = await summonerResponse.json();
    const encryptedSummonerId = summonerData.id;

    const masteryResponse = await fetch(`https://vn2.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${encryptedSummonerId}`, {
      headers: { "X-Riot-Token": RIOT_API_KEY }
    });
    const masteryData = await masteryResponse.json();

    // Trả về dữ liệu thành công
    return {
      statusCode: 200,
      body: JSON.stringify(masteryData)
    };

  } catch (error) {
    return { statusCode: 500, body: "Error fetching data from Riot API." };
  }
};