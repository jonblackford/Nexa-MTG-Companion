(function(){
  async function ensureClient(){
    if (!window.mtgdcSupabase) throw new Error("Supabase client not initialized.");
    return window.mtgdcSupabase;
  }

  async function requireSession(){
    const sb = await ensureClient();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    if (!data || !data.session) throw new Error("Not logged in.");
    return { sb, session: data.session, userId: data.session.user.id };
  }

  const MTGStore = {
    requireSession,

    async listCollections(){
      const { sb, userId } = await requireSession();
      const { data, error } = await sb
        .from("collections")
        .select("id,name,description,created_at,updated_at")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async createCollection(name, description){
      const { sb, userId } = await requireSession();
      const n = String(name || "").trim();
      if (!n) throw new Error("Collection name required.");
      const { data, error } = await sb
        .from("collections")
        .insert({ user_id: userId, name: n, description: description || null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },

    async getOrCreateCollectionIdByName(name){
      const { sb, userId } = await requireSession();
      const n = String(name || "").trim();
      if (!n) throw new Error("Collection name required.");

      const existing = await sb
        .from("collections")
        .select("id")
        .eq("user_id", userId)
        .eq("name", n)
        .maybeSingle();

      if (existing.error) throw existing.error;
      if (existing.data?.id) return existing.data.id;

      return await MTGStore.createCollection(n);
    },

    async getDefaultCollectionName(){
      const { sb, userId } = await requireSession();
      const s = await sb
        .from("user_settings")
        .select("default_collection_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (s.error) throw s.error;

      const defaultId = s.data?.default_collection_id;
      if (!defaultId) return "Stock";

      const c = await sb
        .from("collections")
        .select("name")
        .eq("id", defaultId)
        .maybeSingle();

      if (c.error) throw c.error;
      return c.data?.name || "Stock";
    },

    async addCardToCollectionByName(collectionName, scryfallId, cardName, qty){
      const { sb, userId } = await requireSession();
      const collectionId = await MTGStore.getOrCreateCollectionIdByName(collectionName);
      const amount = Math.max(1, parseInt(qty || 1, 10) || 1);

      const ex = await sb
        .from("collection_cards")
        .select("id,qty")
        .eq("collection_id", collectionId)
        .eq("scryfall_id", scryfallId)
        .eq("is_foil", false)
        .maybeSingle();

      if (ex.error) throw ex.error;

      if (!ex.data){
        const ins = await sb.from("collection_cards").insert({
          user_id: userId,
          collection_id: collectionId,
          scryfall_id: scryfallId,
          card_name: cardName || null,
          qty: amount,
          is_foil: false
        });
        if (ins.error) throw ins.error;
        return;
      }

      const upd = await sb
        .from("collection_cards")
        .update({ qty: ex.data.qty + amount, card_name: cardName || null })
        .eq("id", ex.data.id);

      if (upd.error) throw upd.error;
    },

    async moveCardBetweenCollections(fromName, toName, scryfallId, qty){
      const { sb, userId } = await requireSession();
      const fromId = await MTGStore.getOrCreateCollectionIdByName(fromName);
      const toId = await MTGStore.getOrCreateCollectionIdByName(toName);
      const amount = Math.max(1, parseInt(qty || 1, 10) || 1);

      const src = await sb
        .from("collection_cards")
        .select("id,qty,card_name")
        .eq("collection_id", fromId)
        .eq("scryfall_id", scryfallId)
        .eq("is_foil", false)
        .maybeSingle();

      if (src.error) throw src.error;
      if (!src.data) throw new Error("Card not found in source collection.");

      if (src.data.qty <= amount){
        const del = await sb.from("collection_cards").delete().eq("id", src.data.id);
        if (del.error) throw del.error;
      } else {
        const upd = await sb.from("collection_cards").update({ qty: src.data.qty - amount }).eq("id", src.data.id);
        if (upd.error) throw upd.error;
      }

      await MTGStore.addCardToCollectionByName(toName, scryfallId, src.data.card_name, amount);
    }
  };

  window.MTGStore = MTGStore;

  // Legacy web-ui bridge expected by older pages/buttons
  window.addCollection = async function(name, callback){
    try { await MTGStore.createCollection(name); if (typeof callback==='function') callback(); }
    catch(e){ alert(e?.message || String(e)); }
  };
  window.addStock = async function(idScryfall, callback){
    try { await MTGStore.addCardToCollectionByName("Stock", idScryfall, null, 1); if (typeof callback==='function') callback(); }
    catch(e){ alert(e?.message || String(e)); }
  };
  window.addCard = async function(idScryfall, to, callback){
    try { await MTGStore.addCardToCollectionByName(to, idScryfall, null, 1); if (typeof callback==='function') callback(); }
    catch(e){ alert(e?.message || String(e)); }
  };
  window.moveCard = async function(idScryfall, from, to, callback){
    try { await MTGStore.moveCardBetweenCollections(from, to, idScryfall, 1); if (typeof callback==='function') callback(); }
    catch(e){ alert(e?.message || String(e)); }
  };
})();
