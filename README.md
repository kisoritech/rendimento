# Registro Financeiro

Aplicativo Expo/React Native para acompanhar aportes em metas financeiras. Os dados ficam no SQLite local do aparelho Android e não dependem de servidor ou login.

## Funcionalidades

- criação de várias metas;
- seleção da meta ativa;
- registro persistente de aportes;
- alteração do valor alvo sem perder o histórico;
- gráficos e histórico por meta.

## Gerar o APK

O projeto usa EAS Build para gerar um APK instalável.

1. Instale e autentique o EAS CLI: `npm install --global eas-cli` e `eas login`.
2. Na primeira configuração, execute `eas init` para vincular este diretório a um projeto EAS. O comando grava o identificador do projeto no `app.json`.
3. Crie uma build com `eas build --platform android --profile production`.

O arquivo `eas.json` está configurado para gerar `.apk`, não apenas `.aab`.

## Atualizações pelo GitHub

O workflow `.github/workflows/android-apk.yml` é executado ao publicar uma tag no formato `v1.0.1` ou manualmente pelo GitHub Actions. Ele gera o APK e o anexa a um GitHub Release. Em tags, o workflow usa a própria versão e o número da execução como `versionCode`, permitindo instalar a atualização sobre a versão anterior.

Antes de usar o workflow, adicione o segredo `EXPO_TOKEN` nas configurações do repositório. Para publicar uma nova versão:

```bash
npm version patch
git tag v1.0.1
git push origin main --follow-tags
```

No outro aparelho, baixe o APK anexado ao Release e instale-o por cima da versão anterior. O Android preserva o banco SQLite quando o `android.package` permanece `com.jvra.registrofinanceiro`.

O GitHub não pode instalar uma atualização silenciosamente: a instalação do APK baixado exige confirmação do usuário no Android.
