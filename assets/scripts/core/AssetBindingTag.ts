import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('AssetBindingTag')
export class AssetBindingTag extends Component {
  @property
  bindingKey = '';

  @property
  selectedPath = '';

  @property
  fallbackPath = '';

  @property
  sourceManifest = 'asset_binding_manifest_v2';

  @property
  bindingStatus = '';
}
