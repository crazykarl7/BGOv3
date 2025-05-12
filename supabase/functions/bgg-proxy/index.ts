import { parseString } from 'npm:xml2js@0.6.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const gameId = url.searchParams.get('gameId');
    const geeklistId = url.searchParams.get('geeklistId');

    if (!gameId && !geeklistId) {
      throw new Error('Either Game ID or Geeklist ID is required');
    }

    if (geeklistId) {
      // Fetch Geeklist data
      const response = await fetch(
        `https://boardgamegeek.com/xmlapi/geeklist/${geeklistId}`
      );

      if (!response.ok) {
        throw new Error(`BGG API error: ${response.status}`);
      }

      const xmlData = await response.text();

      // Parse XML to JSON
      const jsonData = await new Promise((resolve, reject) => {
        parseString(xmlData, (err, result) => {
          if (err) reject(err);
          else {
            if (!result.geeklist) {
              reject(new Error('Geeklist not found'));
              return;
            }
            resolve(result);
          }
        });
      });

      return new Response(
        JSON.stringify(jsonData),
        {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Fetch game data
    const response = await fetch(
      `https://boardgamegeek.com/xmlapi/boardgame/${gameId}?stats=1`
    );

    if (!response.ok) {
      throw new Error(`BGG API error: ${response.status}`);
    }

    const xmlData = await response.text();

    // Parse XML to JSON
    const jsonData = await new Promise((resolve, reject) => {
      parseString(xmlData, (err, result) => {
        if (err) reject(err);
        else {
          // Extract and process the game data
          const game = result.boardgames?.boardgame?.[0];
          if (!game) {
            reject(new Error('Game not found'));
            return;
          }

          // Find the primary name
          let primaryName = null;
          const names = game.name || [];
          
          // First try to find a name with primary="true"
          for (const name of names) {
            if (name.$ && name.$.primary === 'true') {
              primaryName = name._ || name;
              break;
            }
          }

          // If no primary name found, use the first name as fallback
          if (!primaryName && names.length > 0) {
            primaryName = names[0]._ || names[0];
          }

          // Update the name in the response to only include the primary name
          if (primaryName) {
            game.name = [primaryName];
          }

          // Extract and round the weight value
          const rawWeight = parseFloat(game.statistics?.[0]?.ratings?.[0]?.averageweight?.[0] || '0');
          const weight = Math.round(rawWeight * 100) / 100;

          // Update the weight in the response
          if (game.statistics?.[0]?.ratings?.[0]?.averageweight?.[0]) {
            game.statistics[0].ratings[0].averageweight[0] = weight.toString();
          }

          resolve(result);
        }
      });
    });

    // Return the parsed and processed data
    return new Response(
      JSON.stringify(jsonData),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});