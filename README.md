# 🦷 OdontoCLI - Dental Clinic Web App

OdontoCLI é uma aplicação web desenvolvida com **Next.js** e **Tailwind CSS**, projetada para facilitar o gerenciamento de uma clínica odontológica. O sistema é dividido em perfis de acesso (admin, dentista, recepcionista) e oferece uma interface moderna, responsiva e intuitiva.

---

## 🚀 Tecnologias Utilizadas

- [Next.js](https://nextjs.org/) (App Router)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [pnpm](https://pnpm.io/) para gerenciamento de pacotes

---

## 📁 Estrutura do Projeto

```
dental-clinic/
├── app/                      # Páginas e rotas
│   ├── layout.tsx
│   ├── page.tsx              # Página inicial
│   └── dashboard/
│       ├── layout.tsx
│       ├── admin/page.tsx
│       ├── dentist/page.tsx
│       └── receptionist/page.tsx
├── components.json
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## 🔧 Instalação e Execução

### 1. Clone o repositório

```bash
git clone https://github.com/SudoMaster7/OdontoCLI.git
cd OdontoCLI
```

### 2. Instale as dependências com pnpm

```bash
pnpm install
```

> Ou use `npm install` ou `yarn`, se preferir.

### 3. Inicie o servidor de desenvolvimento

```bash
pnpm dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 👤 Perfis do Sistema

- **Admin**: Acesso completo ao sistema e gerenciamento de usuários
- **Dentista**: Visualização da agenda e dos pacientes
- **Recepcionista**: Agendamentos e controle de atendimentos

---

## 📌 Recursos Planejados

- [ ] Autenticação com JWT e/ou OAuth
- [ ] Integração com banco de dados (PostgreSQL ou MongoDB)
- [ ] Sistema de agendamento de consultas
- [ ] Upload de arquivos e prontuário digital
- [ ] Responsividade mobile total

---

## 📄 Licença

Este projeto está licenciado sob a Licença MIT.

---

## 🙌 Autor

Desenvolvido com dedicação por [**SudoMaster7**](https://github.com/SudoMaster7)
```
