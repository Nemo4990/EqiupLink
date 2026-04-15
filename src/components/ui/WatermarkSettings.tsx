import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Droplets, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface WatermarkSettingsType {
  enabled: boolean;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  font_size: number;
  color: string;
}

export function WatermarkSettings() {
  const [settings, setSettings] = useState<WatermarkSettingsType>({
    enabled: false,
    text: '',
    position: 'bottom-right',
    opacity: 0.7,
    font_size: 24,
    color: '#FFFFFF',
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        fetchSettings(user.id);
      }
    };
    getUser();
  }, []);

  const fetchSettings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('watermark_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching watermark settings:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('watermark_settings')
        .upsert({
          user_id: user.id,
          ...settings,
        });

      if (error) throw error;
      toast.success('Watermark settings saved');
    } catch (error) {
      console.error('Error saving watermark settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const positions: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'> = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'center',
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <Droplets className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Watermark Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="watermark-enabled"
            checked={settings.enabled}
            onChange={(e) =>
              setSettings({ ...settings, enabled: e.target.checked })
            }
            className="w-4 h-4 text-blue-600 rounded"
          />
          <label htmlFor="watermark-enabled" className="font-medium">
            Enable watermark on uploaded photos
          </label>
        </div>

        {settings.enabled && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                Watermark Text
              </label>
              <input
                type="text"
                value={settings.text}
                onChange={(e) =>
                  setSettings({ ...settings, text: e.target.value })
                }
                placeholder="e.g., Your Business Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Position
                </label>
                <select
                  value={settings.position}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      position: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos.replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Font Size ({settings.font_size}px)
                </label>
                <input
                  type="range"
                  min="12"
                  max="48"
                  value={settings.font_size}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      font_size: parseInt(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Opacity ({(settings.opacity * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={settings.opacity}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={settings.color}
                    onChange={(e) =>
                      setSettings({ ...settings, color: e.target.value })
                    }
                    className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.color}
                    onChange={(e) =>
                      setSettings({ ...settings, color: e.target.value })
                    }
                    placeholder="#FFFFFF"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(settings.color);
                      toast.success('Copied');
                    }}
                    className="p-2 text-gray-500 hover:text-gray-700"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-3">Preview:</p>
              <div className="relative bg-gradient-to-br from-gray-200 to-gray-300 rounded aspect-video flex items-center justify-center overflow-hidden">
                <div
                  className="absolute"
                  style={{
                    opacity: settings.opacity,
                    fontSize: `${settings.font_size}px`,
                    color: settings.color,
                    fontFamily: 'Arial, sans-serif',
                    fontWeight: 'bold',
                    [settings.position.includes('bottom')
                      ? 'bottom'
                      : 'top']: '20px',
                    [settings.position.includes('right')
                      ? 'right'
                      : 'left']: '20px',
                  }}
                >
                  {settings.text || 'Preview Text'}
                </div>
              </div>
            </div>
          </>
        )}

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
