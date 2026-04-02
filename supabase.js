import { createClient } from '@supabase/supabase-js';

class SupabaseSessionStore {
    constructor() {
        // Use environment variables for security!
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        this.supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase Session Store Initialized');
    }

    /**
     * Save creds for a session ID (Upsert)
     */
    async saveCreds(sessionId, credsData) {
        try {
            const { error } = await this.supabase
                .from('session_store')
                .upsert({ 
                    session_id: sessionId, 
                    creds_data: credsData,
                    updated_at: new Date() 
                });

            if (error) throw error;
            console.log(`✅ Saved to Supabase: ${sessionId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to save to Supabase:', error.message);
            return false;
        }
    }

    /**
     * Get creds by session ID
     */
    async getCreds(sessionId) {
        try {
            const { data, error } = await this.supabase
                .from('session_store')
                .select('creds_data')
                .eq('session_id', sessionId)
                .single();

            if (error || !data) {
                console.log(`❌ Not found in Supabase: ${sessionId}`);
                return null;
            }

            console.log(`✅ Retrieved from Supabase: ${sessionId}`);
            return data.creds_data;
        } catch (error) {
            console.error('❌ Failed to get from Supabase:', error.message);
            return null;
        }
    }

    /**
     * Check if session exists
     */
    async sessionExists(sessionId) {
        try {
            const { count, error } = await this.supabase
                .from('session_store')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', sessionId);

            if (error) throw error;
            return count > 0;
        } catch (error) {
            console.error('❌ Failed to check session:', error.message);
            return false;
        }
    }

    /**
     * Search for sessions by pattern (SQL ILIKE)
     */
    async searchSessions(pattern) {
        try {
            const { data, error } = await this.supabase
                .from('session_store')
                .select('session_id')
                .ilike('session_id', `%${pattern}%`);

            if (error) throw error;
            return data.map(item => item.session_id);
        } catch (error) {
            console.error('❌ Failed to search sessions:', error.message);
            return [];
        }
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId) {
        try {
            const { error } = await this.supabase
                .from('session_store')
                .delete()
                .eq('session_id', sessionId);

            if (error) throw error;
            console.log(`🗑️ Deleted from Supabase: ${sessionId}`);
            return true;
        } catch (error) {
            console.error('❌ Failed to delete session:', error.message);
            return false;
        }
    }

    /**
     * Get all sessions
     */
    async getAllSessions() {
        try {
            const { data, error } = await this.supabase
                .from('session_store')
                .select('session_id');

            if (error) throw error;
            const sessions = data.map(item => item.session_id);
            console.log(`📋 Found ${sessions.length} sessions in Supabase`);
            return sessions;
        } catch (error) {
            console.error('❌ Failed to get all sessions:', error.message);
            return [];
        }
    }
}

const supabaseSessionStore = new SupabaseSessionStore();
export default supabaseSessionStore;
