/* Supabase storage layer (Path A)
   - Supabase Auth handles login
   - Supabase Postgres stores user collections/decks/cards via RLS
   - Render backend remains for card search/details/images only
*/
(function () {
  async function requireSession() {
    if (!window.mtgdcSupabase) throw new Error("Supabase client not initialized (mtgdcSupabase missing).");
    const { data, error } = await window.mtgdcSupabase.auth.getSession();
    if (error) throw error;
    const session = data?.session;
    if (!session) throw new Error("Not logged in.");
    return { client: window.mtgdcSupabase, user: session.user };
  }

  async function listCollections() {
    const { client, user } = await requireSession();
    const { data, error } = await client
      .from("collections")
      .select("id,name,description,created_at,updated_at")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (error) throw error;

    // Add optional fields expected by some tables (safe defaults)
    return (data || []).map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || "",
      pc: 0,
      qty: 0,
      cardNumber: 0,
      set: "",
      release: ""
    }));
  }

  async function getOrCreateCollectionByName(name) {
    const { client, user } = await requireSession();
    const trimmed = (name || "").trim();
    if (!trimmed) throw new Error("Collection name is required.");

    const existing = await client
      .from("collections")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", trimmed)
      .maybeSingle();

    if (existing.error) throw existing.error;
    if (existing.data?.id) return existing.data.id;

    const ins = await client
      .from("collections")
      .insert({ user_id: user.id, name: trimmed })
      .select("id")
      .single();

    if (ins.error) throw ins.error;
    return ins.data.id;
  }

  async function getDefaultCollectionName() {
    const { client, user } = await requireSession();
    const settings = await client
      .from("user_settings")
      .select("default_collection_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (settings.error) throw settings.error;

    const defId = settings.data?.default_collection_id;
    if (!defId) return "";

    const col = await client
      .from("collections")
      .select("name")
      .eq("id", defId)
      .maybeSingle();

    if (col.error) throw col.error;
    return col.data?.name || "";
  }

  async function setDefaultCollectionByName(name) {
    const { client, user } = await requireSession();
    const id = await getOrCreateCollectionByName(name);

    const up = await client
      .from("user_settings")
      .upsert({ user_id: user.id, default_collection_id: id }, { onConflict: "user_id" });

    if (up.error) throw up.error;
    return true;
  }

  // Stock: we treat it as a special collection name
  const STOCK_COLLECTION_NAME = "Stock";

  async function addToStock(scryfallId, cardName) {
    return addCardToCollectionByName(STOCK_COLLECTION_NAME, scryfallId, cardName);
  }

  async function listStocks() {
    const { client, user } = await requireSession();
    const stockId = await getOrCreateCollectionByName(STOCK_COLLECTION_NAME);

    const { data, error } = await client
      .from("collection_cards")
      .select("id, scryfall_id, card_name, qty, is_foil, condition, language, created_at")
      .eq("user_id", user.id)
      .eq("collection_id", stockId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // Shape for existing DataTables columns in stocks.html
    return (data || []).map(r => ({
      id: r.id,
      qte: r.qty,
      price: 0,
      condition: r.condition || "",
      language: r.language || "",
      foil: !!r.is_foil,
      signed: false,
      altered: false,
      magicCollection: { name: STOCK_COLLECTION_NAME },
      product: {
        name: r.card_name || r.scryfall_id,
        edition: ""
      }
    }));
  }

  async function addCardToCollectionByName(collectionName, scryfallId, cardName) {
    const { client, user } = await requireSession();
    const collectionId = await getOrCreateCollectionByName(collectionName);

    const existing = await client
      .from("collection_cards")
      .select("id, qty")
      .eq("collection_id", collectionId)
      .eq("scryfall_id", scryfallId)
      .eq("is_foil", false)
      .maybeSingle();

    if (existing.error) throw existing.error;

    if (!existing.data) {
      const ins = await client
        .from("collection_cards")
        .insert({
          user_id: user.id,
          collection_id: collectionId,
          scryfall_id: scryfallId,
          card_name: cardName || null,
          qty: 1
        });

      if (ins.error) throw ins.error;
      return true;
    }

    const upd = await client
      .from("collection_cards")
      .update({ qty: existing.data.qty + 1, card_name: cardName || null })
      .eq("id", existing.data.id);

    if (upd.error) throw upd.error;
    return true;
  }

  async function moveCardBetweenCollections(fromName, toName, scryfallId) {
    const { client, user } = await requireSession();
    const fromId = await getOrCreateCollectionByName(fromName);
    const toId = await getOrCreateCollectionByName(toName);

    // read from row
    const fromRow = await client
      .from("collection_cards")
      .select("id, qty, card_name, is_foil, condition, language")
      .eq("collection_id", fromId)
      .eq("scryfall_id", scryfallId)
      .maybeSingle();

    if (fromRow.error) throw fromRow.error;
    if (!fromRow.data) return true; // nothing to move

    const cardName = fromRow.data.card_name || null;

    // decrement/remove from
    if (fromRow.data.qty <= 1) {
      const del = await client.from("collection_cards").delete().eq("id", fromRow.data.id);
      if (del.error) throw del.error;
    } else {
      const upd = await client
        .from("collection_cards")
        .update({ qty: fromRow.data.qty - 1 })
        .eq("id", fromRow.data.id);
      if (upd.error) throw upd.error;
    }

    // increment/add to
    const toRow = await client
      .from("collection_cards")
      .select("id, qty")
      .eq("collection_id", toId)
      .eq("scryfall_id", scryfallId)
      .maybeSingle();

    if (toRow.error) throw toRow.error;

    if (!toRow.data) {
      const ins = await client
        .from("collection_cards")
        .insert({
          user_id: user.id,
          collection_id: toId,
          scryfall_id: scryfallId,
          card_name: cardName,
          qty: 1
        });
      if (ins.error) throw ins.error;
    } else {
      const upd = await client
        .from("collection_cards")
        .update({ qty: toRow.data.qty + 1, card_name: cardName })
        .eq("id", toRow.data.id);
      if (upd.error) throw upd.error;
    }

    return true;
  }

  async function listDecks() {
    const { client, user } = await requireSession();
    const { data, error } = await client
      .from("decks")
      .select("id,name,commander,colors,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    return (data || []).map(d => ({
      id: d.id,
      name: d.name,
      commander: d.commander || "",
      colors: Array.isArray(d.colors) ? d.colors.join("") : (d.colors || ""),
      tags: "",
      creationDate: d.created_at
    }));
  }

  window.MTGStore = {
    listCollections,
    getOrCreateCollectionByName,
    getDefaultCollectionName,
    setDefaultCollectionByName,
    addCardToCollectionByName,
    moveCardBetweenCollections,
    listStocks,
    addToStock,
    listDecks,
    STOCK_COLLECTION_NAME
  };
})();
