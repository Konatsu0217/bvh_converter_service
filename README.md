==================================== Notice ====================================

1. please go [bvh2vrma](https://github.com/vrm-c/bvh2vrma) to find more detail.
2. this repo is modified from original repo ⬆️，I just make it work like a backend service
3. this repo is just use as a submodule for my own repo.

   
==================================== Notice ====================================


# bvh to VRMA

このリポジトリは bvh ファイルを VRMアニメーション ファイルに変換する web アプリケーションのリポジトリです。

# デモ

GitHub Pages でデモを公開しています。
https://vrm-c.github.io/bvh2vrma/

# 注意点

- 変換結果を保証するものではありません。入力された bvh ファイルによっては失敗することがあります。

# 開発を行うには

ローカル環境で開発を行うにはこのリポジトリをクローンしてください。

```
git clone https://github.com/vrm-c/bvh2vrma
```

必要なパッケージをインストールの上、開発用の web サーバーの起動を行ってください。

```
yarn install && yarn dev
```

# VRMアニメーション

VRMアニメーションは、VRMで定義された人型モデルに対するアニメーションを記述するための glTF 拡張です。
VRMアニメーションファイルについての詳細は[Webサイト](https://vrm.dev/vrma/)をご覧ください。
また、詳しい仕様に関しては別途[仕様書](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm_animation-1.0/README.ja.md)をお読みいただけますと幸いです。

# ライセンス

- [MIT ライセンス](./LICENSE.txt)
