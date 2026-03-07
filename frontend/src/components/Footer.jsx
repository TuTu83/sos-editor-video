import React from 'react';
import { Github, Twitter, Instagram, Mail, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-background border-t border-white/5 pt-20 pb-10">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <a href="#" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-tr from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold">S</div>
              <span className="font-display font-bold text-xl text-white">S.O.S Editor</span>
            </a>
            <p className="text-gray-400 max-w-sm leading-relaxed mb-6">
              A missão do S.O.S Editor é democratizar a criação de conteúdo, oferecendo ferramentas profissionais que rodam em qualquer computador.
            </p>
            <div className="flex gap-4">
              <SocialLink icon={<Twitter size={20} />} />
              <SocialLink icon={<Instagram size={20} />} />
              <SocialLink icon={<Github size={20} />} />
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Produto</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#features" className="hover:text-primary transition-colors">Recursos</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Preços</a></li>
              <li><a href="#download" className="hover:text-primary transition-colors">Download</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-6">Legal</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
              <li><a href="./admin/" className="hover:text-primary transition-colors">Área Admin</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            &copy; 2026 S.O.S Editor. Todos os direitos reservados.
          </p>
          <p className="text-gray-500 text-sm flex items-center gap-1">
            Feito com <Heart size={12} className="text-red-500 fill-red-500" /> para criadores.
          </p>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ icon }) {
  return (
    <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-all hover:-translate-y-1">
      {icon}
    </a>
  );
}
