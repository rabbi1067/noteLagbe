with open('frontend/src/components/Navbar.tsx', 'r', encoding='utf-8') as f:
    nav = f.read()

# 1. Container padding
nav = nav.replace('px-4 sm:px-6 lg:px-8', 'px-3 sm:px-6 lg:px-8')

# 2. Theme button padding
nav = nav.replace(
    'className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"',
    'className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"'
)

# 3. Sign in button padding
nav = nav.replace(
    'className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20"',
    'className="py-1.5 px-3 sm:py-2 sm:px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 whitespace-nowrap"'
)

# 4. Hamburger button padding
nav = nav.replace(
    'className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"',
    'className="md:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"'
)

# 5. Add Sign In and Theme toggle to Mobile Drawer
old_drawer_settings = '''          {/* Mobile Quick Settings (Language & Theme) */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold px-1">
            <span className="text-slate-500 dark:text-slate-400">Language / ভাষা</span>
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
            >
              <span>{language === "en" ? "English (EN)" : "বাংলা (বাং)"}</span>
            </button>
          </div>'''

new_drawer_settings = '''          {!isAuthenticated && (
            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowAuthModal(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{t("nav.signIn", "Sign In")} / {language === "bn" ? "নিবন্ধন" : "Register"}</span>
              </button>
            </div>
          )}

          {/* Mobile Quick Settings (Language & Theme) */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold px-1">
            <span className="text-slate-500 dark:text-slate-400">Settings</span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
              >
                <span>{language === "en" ? "EN" : "বাং"}</span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
                <span className="text-[11px]">{isDark ? "Light" : "Dark"}</span>
              </button>
            </div>
          </div>'''

if old_drawer_settings in nav:
    nav = nav.replace(old_drawer_settings, new_drawer_settings)
    print("Mobile drawer settings replaced.")
else:
    print("Warning: old_drawer_settings not matched directly.")

with open('frontend/src/components/Navbar.tsx', 'w', encoding='utf-8') as f:
    f.write(nav)

print("Navbar updated successfully.")
