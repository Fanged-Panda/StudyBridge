import { Link } from 'react-router-dom';

const team = [
  {
    name: 'MD. Sajjad Hossain',
    role: 'Homepage, Login & Student Profile',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Sajjad&backgroundColor=b6e3f4',
    github: 'https://github.com/Fanged-Panda',
  },
  {
    name: 'A M Fardin Hasan',
    role: 'University, Scholarship & Professors ',
    avatar: 'https://api.dicebear.com/10.x/notionists/svg?backgroundColor=c0aede&seed=Fardin',
    github: 'https://github.com/AM-FArdin',
  },
  {
    name: 'Tahmid Hossain',
    role: 'Chatbot AI, Notification & Admin Portal',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Tahmid&backgroundColor=ffd5dc',
    github: 'https://github.com/CodeNerd-89',
  },
  {
    name: 'Hasan Mahmud',
    role: 'Wordlab & Community',
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Hasan&backgroundColor=d1f4d1',
    github: 'https://github.com/Hasan-mahmud-22',
  },
];

const Footer = () => {
  return (
    <footer className="border-t border-outline bg-white pb-8 pt-20">
      <div className="mx-auto max-w-[1200px] px-8">
        {/* Team Section */}
        <div className="mb-12 text-center">
          <h3 className="mb-2 font-['Plus_Jakarta_Sans'] text-xl font-bold text-primary">
            Meet the Team
          </h3>
          <p className="mb-8 text-sm text-text-muted">
            Built with passion by 4 students as part of our academic project.
          </p>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {team.map((member) => (
              <a
                key={member.name}
                href={member.github}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center rounded-xl p-5 transition-all duration-300 hover:bg-secondary/30"
              >
                <div className="relative mb-3">
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-outline/30 transition-all duration-300 group-hover:border-accent/50">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-accent text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                  </span>
                </div>
                <h4 className="text-sm font-bold text-primary transition-colors group-hover:text-accent">
                  {member.name}
                </h4>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  {member.role}
                </p>
              </a>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-outline pt-8 md:flex-row">
          <p className="text-xs font-semibold text-text-muted">
            &copy; {new Date().getFullYear()} StudyBridge Academic Solutions. A student project.
          </p>
          <div className="flex gap-8 text-xs font-bold text-text-muted">
            <a href="#" className="transition-colors hover:text-primary">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-primary">Terms of Service</a>
            <a href="#" className="transition-colors hover:text-primary">Institutional Access</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
