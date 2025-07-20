// netlify/functions/getArenaStats.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const METASRC_API_URL = 'https://www.metasrc.com/api/lol/arena/v1/champion/statistics?patch=latest';

  try {
    const response = await fetch(METASRC_API_URL);
    if (!response.ok) {
      return { statusCode: response.status, body: response.statusText };
    }
    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      // Thêm header để cho phép trình duyệt của bạn truy cập
      headers: {
        'Access-Control-Allow-Origin': '*', 
      },
    };
  } catch (error) {
    return { statusCode: 500, body: error.toString() };
  }
};